// app/api/pusher/auth/route.ts
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  // sécurité : l'utilisateur doit être participant du salon
  if (channelName.startsWith("private-chat-")) {
    const roomId = channelName.replace("private-chat-", "");

    const participant = await prisma.chatParticipant.findFirst({
      where: {
        roomId,
        userId: session.user.id,
      },
    });

    if (!participant) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
