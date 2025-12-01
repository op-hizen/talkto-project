// app/api/chat/send/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";        // ✅ Prisma + NextAuth => Node
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher/server";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    // ✅ Auth unique: NextAuth (pas Supabase auth)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const roomId = body?.roomId as string | undefined;
    const content = body?.content as string | undefined;
    const replyToId = body?.replyToId as string | null | undefined;

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const trimmed = content.trim();

    // ✅ Sécurité: l'utilisateur doit être participant
    const isParticipant = await prisma.chatParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Création message (replyToId -> parentId)
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        content: trimmed,
        parentId: replyToId ?? null,
        authorId: userId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        isEdited: true,
        deletedAt: true,
        author: {
          select: {
            id: true,
            username: true,
            image: true,
            role: true,
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, username: true } },
          },
        },
      },
    });

    // ✅ Réponse immédiate
    const res = NextResponse.json({ ok: true, message });

    // ✅ Broadcast non bloquant
    void pusherServer.trigger(
      `private-chat-${roomId}`,
      "new-message",
      message
    );

    return res;
  } catch (e) {
    console.error("[/api/chat/send] error:", e);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
