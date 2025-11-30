// app/chat/[roomId]/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher/server";
import { revalidatePath } from "next/cache";

const SAFE_DEBATE_SLUG = "safe-debate";
const SAFE_DEBATE_COOLDOWN_SECONDS = 15;

// Détection large des emojis (Unicode)
const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

function containsEmoji(str: string): boolean {
  return EMOJI_REGEX.test(str);
}

function mapMessageForClient(message: any) {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    isEdited: message.isEdited,
    deletedAt: message.deletedAt,
    author: {
      id: message.author.id,
      username: message.author.username,
      image: (message.author as any).image ?? null,
      role: (message.author as any).role ?? "USER",
    },
    replyTo: message.parent
      ? {
          id: message.parent.id,
          content: message.parent.deletedAt
            ? "Message supprimé"
            : message.parent.content,
          author: {
            id: message.parent.author.id,
            username: message.parent.author.username,
          },
        }
      : null,
  };
}

// 🔒 Vérif ban centralisée
async function ensureNotBanned(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessStatus: true },
  });

  if (!user) {
    throw new Error("Utilisateur introuvable.");
  }

  if (user.accessStatus === "BANNED") {
    throw new Error("Tu as été banni de TalkTo.");
  }
}

export async function sendMessageAction(
  roomId: string,
  content: string,
  replyToMessageId?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  await ensureNotBanned(userId);

  const text = content.trim();
  if (!text) return;

  // On récupère le salon pour connaître son slug (safe-debate ou pas)
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { id: true, slug: true },
  });

  if (!room) {
    throw new Error("Salon introuvable");
  }

  const isSafeDebate = room.slug === SAFE_DEBATE_SLUG;

  // 🔒 RÈGLES SAFE-DEBATE : emojis + cooldown
  if (isSafeDebate) {
    if (containsEmoji(text)) {
      throw new Error("Les emojis sont interdits dans ce salon.");
    }

    const lastMessage = await prisma.chatMessage.findFirst({
      where: {
        roomId: room.id,
        authorId: userId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (lastMessage) {
      const diffSeconds =
        (Date.now() - lastMessage.createdAt.getTime()) / 1000;

      if (diffSeconds < SAFE_DEBATE_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(
          SAFE_DEBATE_COOLDOWN_SECONDS - diffSeconds
        );
        throw new Error(
          `Tu dois attendre encore ${remaining}s avant d’envoyer un nouveau message dans ce salon.`
        );
      }
    }
  }

  // s'assurer qu'il est bien participant au salon
  let participant = await prisma.chatParticipant.findFirst({
    where: { roomId: room.id, userId },
  });

  if (!participant) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const chatRole =
      dbUser?.role === "ADMIN" || dbUser?.role === "DEV"
        ? "ADMIN"
        : dbUser?.role === "MODERATOR" || dbUser?.role === "SUPPORT"
        ? "MODERATOR"
        : "USER";

    participant = await prisma.chatParticipant.create({
      data: {
        roomId: room.id,
        userId,
        role: chatRole,
      },
    });
  }

  // gestion reply / thread
  let parent: any = null;
  if (replyToMessageId) {
    parent = await prisma.chatMessage.findUnique({
      where: { id: replyToMessageId },
      include: { author: true },
    });

    if (!parent || parent.roomId !== room.id) {
      throw new Error("Invalid reply target");
    }
  }

  const message = await prisma.chatMessage.create({
    data: {
      content: text,
      roomId: room.id,
      authorId: userId,
      parentId: parent ? parent.id : null,
    },
    include: {
      author: true,
      room: true,
      parent: {
        include: { author: true },
      },
    },
  });

  const payload = mapMessageForClient(message);

  await pusherServer.trigger(
    `private-chat-${room.id}`,
    "new-message",
    payload
  );

  const path = message.room.slug
    ? `/chat/${message.room.slug}`
    : `/chat/${message.room.id}`;
  revalidatePath(path);

  return payload;
}

export async function editMessageAction(messageId: string, newContent: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  await ensureNotBanned(userId);

  const text = newContent.trim();
  if (!text) return;

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { author: true, room: true },
  });
  if (!message) throw new Error("Message not found");
  if (message.authorId !== userId) throw new Error("Forbidden");
  if (message.deletedAt) throw new Error("Cannot edit deleted message");
  if (message.content === text) return;

  const isSafeDebate = message.room.slug === SAFE_DEBATE_SLUG;

  // 🔒 SAFE-DEBATE : emojis aussi interdits en édition
  if (isSafeDebate && containsEmoji(text)) {
    throw new Error("Les emojis sont interdits dans ce salon.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.chatMessageHistory.create({
      data: {
        messageId: message.id,
        previousContent: message.content,
        type: "EDIT",
        editedById: userId,
      },
    });

    return tx.chatMessage.update({
      where: { id: message.id },
      data: {
        content: text,
        isEdited: true,
      },
      include: {
        author: true,
        room: true,
        parent: {
          include: { author: true },
        },
      },
    });
  });

  const payload = mapMessageForClient(updated);

  await pusherServer.trigger(
    `private-chat-${updated.roomId}`,
    "edit-message",
    payload
  );

  const path = updated.room.slug
    ? `/chat/${updated.room.slug}`
    : `/chat/${updated.room.id}`;
  revalidatePath(path);

  return payload;
}

export async function deleteMessageAction(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  await ensureNotBanned(userId);

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { author: true, room: true },
  });
  if (!message) throw new Error("Message not found");
  if (message.authorId !== userId) throw new Error("Forbidden");
  if (message.deletedAt) return mapMessageForClient(message);

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.chatMessageHistory.create({
      data: {
        messageId: message.id,
        previousContent: message.content,
        type: "DELETE",
        editedById: userId,
      },
    });

    return tx.chatMessage.update({
      where: { id: message.id },
      data: { deletedAt: now },
      include: {
        author: true,
        room: true,
        parent: {
          include: { author: true },
        },
      },
    });
  });

  await pusherServer.trigger(
    `private-chat-${updated.roomId}`,
    "delete-message",
    {
      id: updated.id,
      deletedAt: updated.deletedAt,
    }
  );

  const path = updated.room.slug
    ? `/chat/${updated.room.slug}`
    : `/chat/${updated.room.id}`;
  revalidatePath(path);

  return mapMessageForClient(updated);
}
