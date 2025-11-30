import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/auth";

const PAGE_SIZE = 40;

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const cursorId = searchParams.get("cursor"); // ChatMessage.id

    if (!roomId) {
      return NextResponse.json(
        { error: "roomId is required" },
        { status: 400 }
      );
    }

    // ✅ sécurité : le user doit être participant
    const participant = await prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { id: true },
    });
    if (!participant) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // si cursorId fourni, on récupère son createdAt
    let cursorCreatedAt: Date | null = null;
    if (cursorId) {
      const cursorMsg = await prisma.chatMessage.findUnique({
        where: { id: cursorId },
        select: { createdAt: true, roomId: true },
      });

      if (!cursorMsg || cursorMsg.roomId !== roomId) {
        return NextResponse.json(
          { error: "invalid cursor" },
          { status: 400 }
        );
      }
      cursorCreatedAt = cursorMsg.createdAt;
    }

    // pagination "older than cursor"
    // on fetch DESC puis reverse ASC
    const raw = await prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(cursorCreatedAt
          ? { createdAt: { lt: cursorCreatedAt } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      include: {
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
            author: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    const hasMore = raw.length > PAGE_SIZE;
    const slice = hasMore ? raw.slice(0, PAGE_SIZE) : raw;
    const oldest = slice[slice.length - 1];
    const nextCursor = hasMore && oldest ? oldest.id : null;

    const messages = slice
      .reverse()
      .map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        isEdited: m.isEdited,
        deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
        author: {
          id: m.author.id,
          username: m.author.username,
          image: m.author.image,
          role: m.author.role,
        },
        replyTo: m.parent
          ? {
              id: m.parent.id,
              content: m.parent.content,
              author: {
                id: m.parent.author.id,
                username: m.parent.author.username,
              },
            }
          : null,
      }));

    return NextResponse.json({ messages, nextCursor });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}
