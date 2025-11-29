// app/api/support/messages/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STAFF_ROLES = ["ADMIN", "DEV", "MODERATOR", "SUPPORT"] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Tu dois être connecté pour répondre à un ticket." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const ticketId =
      typeof body?.ticketId === "string" ? body.ticketId.trim() : "";
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (!ticketId || !message) {
      return NextResponse.json(
        { error: "Ticket et message sont obligatoires." },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket introuvable." },
        { status: 404 }
      );
    }

    if (ticket.status === "CLOSED") {
      return NextResponse.json(
        { error: "Ce ticket est clôturé, tu ne peux plus y répondre." },
        { status: 400 }
      );
    }

    // 🔍 On lit le rôle en base, pas depuis la session
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    const isStaff = STAFF_ROLES.includes(
      dbUser.role as (typeof STAFF_ROLES)[number]
    );

    // User normal : doit être propriétaire du ticket
    if (!isStaff && ticket.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Tu n'es pas autorisé à répondre sur ce ticket." },
        { status: 403 }
      );
    }

    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        userId: session.user.id,
        body: message,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/support/messages:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
