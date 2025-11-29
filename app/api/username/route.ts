// app/api/username/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateUsername } from "@/lib/username";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });

    if (!token || !token.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const rawUsername =
      typeof body?.username === "string" ? body.username : "";

    const value = rawUsername.trim();

    // On récupère l'utilisateur pour connaître rôle / statut / cooldown
    const dbUser = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: {
        username: true,
        lastUsernameChangeAt: true,
        accessStatus: true,
        role: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    // BANNED = pas de modif de pseudo
    if (dbUser.accessStatus === "BANNED") {
      return NextResponse.json(
        { error: "Ton compte est banni, tu ne peux pas modifier ton pseudo." },
        { status: 403 }
      );
    }

    const isPrivileged =
      dbUser.role === "ADMIN" || dbUser.role === "DEV";

    // Validation du pseudo (longueur adaptée si ADMIN/DEV)
    const validationError = validateUsername(value, { isPrivileged });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Cooldown 24h → ignoré pour ADMIN/DEV
    if (!isPrivileged && dbUser.username && dbUser.lastUsernameChangeAt) {
      const lastChange = dbUser.lastUsernameChangeAt.getTime();
      const now = Date.now();
      const diffMs = now - lastChange;
      const hours = diffMs / (1000 * 60 * 60);

      if (hours < 24) {
        const remaining = Math.ceil(24 - hours);
        return NextResponse.json(
          {
            error: `Tu pourras changer de pseudo dans environ ${remaining} heure(s).`,
          },
          { status: 400 }
        );
      }
    }

    // Vérifier unicité (même règle pour tout le monde)
    const existing = await prisma.user.findUnique({
      where: { username: value },
      select: { id: true },
    });

    if (existing && existing.id !== token.id) {
      return NextResponse.json(
        { error: "Ce pseudo est déjà pris." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: token.id as string },
      data: {
        username: value,
        lastUsernameChangeAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error in /api/username:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
