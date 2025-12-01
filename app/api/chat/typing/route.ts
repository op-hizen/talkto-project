// app/api/chat/typing/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";        // ✅ NextAuth v5 => Node
export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const roomId = body?.roomId;

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // ✅ Perf: ne crée PAS de participant sur un event typing.
    // Le typing est éphémère, on vérifie juste s'il est participant.
    const isParticipant = await prisma.chatParticipant.findFirst({
      where: { roomId, userId },
      select: { id: true },
    });

    if (!isParticipant) {
      // pas participant => on ignore silencieusement (pas d'auto-join ici)
      return NextResponse.json({ ok: true });
    }

    // ✅ Username: si NextAuth l'a déjà, pas besoin de requête DB
    let username =
      session.user.username?.trim() ||
      session.user.name?.trim() ||
      "";

    if (!username) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, name: true, email: true },
      });

      const emailLocalPart =
        dbUser?.email && dbUser.email.includes("@")
          ? dbUser.email.split("@")[0]
          : "";

      username =
        (dbUser?.username && dbUser.username.trim()) ||
        (dbUser?.name && dbUser.name.trim()) ||
        emailLocalPart ||
        `user-${userId.slice(0, 6)}`;
    }

    // ✅ Pusher non bloquant
    void pusherServer.trigger(`private-chat-${roomId}`, "typing", {
      userId,
      username,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/chat/typing] error:", e);
    return NextResponse.json({ error: "Typing failed" }, { status: 500 });
  }
}
