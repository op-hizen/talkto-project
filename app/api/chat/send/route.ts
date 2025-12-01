// app/api/chat/send/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher/server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    // ✅ cookies() async chez toi
    const cookieStore = await cookies();

    // ✅ on utilise les env serveur-only (plus propre)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnon = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnon) {
      console.error("[/api/chat/send] Missing SUPABASE_URL or SUPABASE_ANON_KEY");
      return NextResponse.json(
        { error: "Supabase env missing" },
        { status: 500 }
      );
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { roomId, content, replyToId } = body as {
      roomId?: string;
      content?: string;
      replyToId?: string | null;
    };

    if (!roomId || !content || !content.trim()) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const trimmed = content.trim();

    // ✅ mapping Supabase UUID -> User interne (cuid)
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found (missing supabaseId mapping)" },
        { status: 404 }
      );
    }

    // ✅ replyToId -> parentId (threads)
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        content: trimmed,
        parentId: replyToId ?? null,
        authorId: dbUser.id,
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

    const res = NextResponse.json({ ok: true, message });

    // ✅ Pusher non bloquant
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
