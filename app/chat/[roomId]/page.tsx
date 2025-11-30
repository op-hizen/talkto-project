import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { ChatRoomShell } from "./_components/ChatRoomShell";
import type { Message } from "./ChatRoomClient";

type Params = { roomId: string };

export const runtime = "nodejs";

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { roomId: slugOrId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [room, dbUser] = await Promise.all([
    prisma.chatRoom.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
      include: {
        messages: {
          include: {
            author: true,
            parent: {
              include: { author: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        participants: {
          include: { user: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        email: true,
        name: true,
        accessStatus: true,
      },
    }),
  ]);

  if (!dbUser) redirect("/login");

  if (dbUser.accessStatus === "BANNED") {
    redirect("/banned");
  }

  if (!room) notFound();

  const existingParticipant = room.participants.find(
    (p) => p.userId === userId
  );

  if (!existingParticipant) {
    await prisma.chatParticipant.create({
      data: {
        roomId: room.id,
        userId,
        role: "USER",
      },
    });
  }

  const emailLocalPart =
    dbUser.email && dbUser.email.includes("@")
      ? dbUser.email.split("@")[0]
      : "";

  const currentUsername: string =
    (dbUser.username && dbUser.username.trim()) ||
    (dbUser.name && dbUser.name.trim()) ||
    emailLocalPart ||
    `user-${userId.slice(0, 6)}`;

  const initialMessages: Message[] = room.messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    isEdited: m.isEdited,
    deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
    author: {
      id: m.author.id,
      username: m.author.username,
      image: (m.author as any).image ?? null,
      role: (m.author as any).role ?? "USER",
    },
    replyTo: m.parent
      ? {
          id: m.parent.id,
          content: m.parent.deletedAt ? "Message supprimé" : m.parent.content,
          author: {
            id: m.parent.author.id,
            username: m.parent.author.username,
          },
        }
      : null,
  }));

  const roomSlug = room.slug ?? room.id;
  const roomDisplayName = room.name ?? `#${roomSlug}`;
  const participantsCount = room.participants.length;

  const participantsForClient = room.participants.map((p) => ({
    id: p.user.id,
    username: p.user.username,
    image: (p.user as any).image ?? null,
    role: (p.user as any).role ?? "USER",
    createdAt: p.user.createdAt.toISOString(),
  }));

  return (
    <ChatRoomShell
      roomId={room.id}
      roomSlug={roomSlug}
      roomDisplayName={roomDisplayName}
      currentUserId={userId}
      currentUsername={currentUsername}
      initialMessages={initialMessages}
      participantsCount={participantsCount}
      participants={participantsForClient}
    />
  );
}
