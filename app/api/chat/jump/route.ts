import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/auth";

const WINDOW = 12;

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");
    const messageId = searchParams.get("messageId");

    if (!roomId || !messageId) {
      return NextResponse.json(
        { error: "roomId and messageId required" },
        { status: 400 }
      );
    }

    const participant = await prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { id: true },
    });
    if (!participant) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const target = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { createdAt: true, roomId: true },
    });
    if (!target || target.roomId !== roomId) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const before = await prisma.chatMessage.findMany({
      where: { roomId, createdAt: { lt: target.createdAt } },
      orderBy: { createdAt: "desc" },
      take: WINDOW,
      include: {
        author: { select: { id: true, username: true, image: true, role: true } },
        parent: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, username: true } },
          },
        },
      },
    });

    const after = await prisma.chatMessage.findMany({
      where: { roomId, createdAt: { gt: target.createdAt } },
      orderBy: { createdAt: "asc" },
      take: WINDOW,
      include: {
        author: { select: { id: true, username: true, image: true, role: true } },
        parent: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, username: true } },
          },
        },
      },
    });

    const center = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        author: { select: { id: true, username: true, image: true, role: true } },
        parent: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, username: true } },
          },
        },
      },
    });

    const all = [...before.reverse(), center!, ...after].map((m) => ({
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

    return NextResponse.json({ messages: all, anchorId: messageId });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}
