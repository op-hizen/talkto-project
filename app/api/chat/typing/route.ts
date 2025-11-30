// app/api/chat/typing/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { roomId } = await req.json();
  if (!roomId || typeof roomId !== "string") {
    return new NextResponse("Bad request", { status: 400 });
  }

  // On s’assure que l’utilisateur est bien participant au salon
  let participant = await prisma.chatParticipant.findFirst({
    where: { roomId, userId: session.user.id },
  });

  if (!participant) {
    participant = await prisma.chatParticipant.create({
      data: {
        roomId,
        userId: session.user.id,
        role: "USER",
      },
    });
  }

  // On récupère un username propre côté serveur
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, name: true, email: true },
  });

  const emailLocalPart =
    dbUser?.email && dbUser.email.includes("@")
      ? dbUser.email.split("@")[0]
      : "";

  const username =
    (dbUser?.username && dbUser.username.trim()) ||
    (dbUser?.name && dbUser.name.trim()) ||
    emailLocalPart ||
    `user-${session.user.id.slice(0, 6)}`;

  await pusherServer.trigger(`private-chat-${roomId}`, "typing", {
    userId: session.user.id,
    username,
  });

  return NextResponse.json({ ok: true });
}
