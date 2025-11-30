// app/api/username/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateUsername } from "@/lib/username";
import { auth } from "@/auth"; // <-- ton fichier auth.ts

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const rawUsername = typeof body?.username === "string" ? body.username : "";
    const value = rawUsername.trim();

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        username: true,
        lastUsernameChangeAt: true,
        accessStatus: true,
        role: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    if (dbUser.accessStatus === "BANNED") {
      return NextResponse.json(
        { error: "Ton compte est banni, tu ne peux pas modifier ton pseudo." },
        { status: 403 }
      );
    }

    const isPrivileged = dbUser.role === "ADMIN" || dbUser.role === "DEV";

    const validationError = validateUsername(value, { isPrivileged });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (!isPrivileged && dbUser.username && dbUser.lastUsernameChangeAt) {
      const hours = (Date.now() - dbUser.lastUsernameChangeAt.getTime()) / 36e5;
      if (hours < 24) {
        const remaining = Math.ceil(24 - hours);
        return NextResponse.json(
          { error: `Tu pourras changer de pseudo dans environ ${remaining} heure(s).` },
          { status: 400 }
        );
      }
    }

    const existing = await prisma.user.findUnique({
      where: { username: value },
      select: { id: true },
    });

    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Ce pseudo est déjà pris." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { username: value, lastUsernameChangeAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/username:", err);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
