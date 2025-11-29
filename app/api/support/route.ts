// app/api/support/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Tu dois être connecté pour contacter le support." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);

    const subject =
      typeof body?.subject === "string" ? body.subject.trim() : "";
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Sujet et message sont obligatoires." },
        { status: 400 }
      );
    }

    const email = session.user.email;
    const username = session.user.username ?? null;

    if (!email) {
      return NextResponse.json(
        {
          error:
            "Aucune adresse email associée à ton compte, impossible de créer un ticket.",
        },
        { status: 400 }
      );
    }

    // 🔒 Limite : max 3 tickets en cours (OPEN ou IN_PROGRESS)
    const activeCount = await prisma.supportTicket.count({
      where: {
        userId: session.user.id,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    });

    if (activeCount >= 3) {
      return NextResponse.json(
        {
          error:
            "Tu as déjà 3 tickets en cours. Tu pourras en créer un nouveau lorsque certains seront clôturés.",
        },
        { status: 400 }
      );
    }

    // 👉 Création du ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.user.id,
        email,
        username,
        subject,
        message, // on garde une copie “brute” sur le ticket
      },
    });

    // 👉 Création du premier message dans la conversation
    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        userId: session.user.id,
        body: message,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/support:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
