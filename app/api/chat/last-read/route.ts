import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId(req);

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { error: "roomId is required" },
        { status: 400 }
      );
    }

    const participant = await prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { lastReadAt: true },
    });

    if (!participant) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      lastReadAt: participant.lastReadAt
        ? participant.lastReadAt.toISOString()
        : null,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId(req);
    const body = await req.json();

    const roomId = body?.roomId as string | undefined;
    const lastReadAtIso = body?.lastReadAt as string | undefined;

    if (!roomId || !lastReadAtIso) {
      return NextResponse.json(
        { error: "roomId and lastReadAt are required" },
        { status: 400 }
      );
    }

    const lastReadAt = new Date(lastReadAtIso);
    if (Number.isNaN(lastReadAt.getTime())) {
      return NextResponse.json(
        { error: "lastReadAt must be ISO date" },
        { status: 400 }
      );
    }

    // ✅ le user doit être participant
    const participant = await prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { id: true, lastReadAt: true },
    });

    if (!participant) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // ✅ on n'autorise jamais une régression
    if (!participant.lastReadAt || participant.lastReadAt < lastReadAt) {
      await prisma.chatParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}
