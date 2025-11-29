// app/banned/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import BannedView from "./BannedView";

export const runtime = "nodejs";

const fmt = (d?: Date | null) =>
  d
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      }).format(d)
    : "—";

export default async function BannedPage() {
  const session = await auth();
  const userId = session?.user?.id ? String(session.user.id) : null;

  // Pas connecté → blocage générique (IP / device / pré-auth)
  if (!userId) {
    const banReason =
      "Ton accès à TalkTo est actuellement bloqué. " +
      "Cela peut être lié à ton compte, ton adresse IP ou ton appareil.";

    return (
      <BannedView
        userId="—"
        banReason={banReason}
        moderatorId="—"
        banCreatedAt="—"
        banExpiresAt="—"
        isPermanent={false}
        actionId="—"
      />
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      accessStatus: true,
      createdAt: true,
    },
  });

  // Plus banni → on renvoie vers le dashboard
  if (!user || user.accessStatus !== "BANNED") {
    redirect("/dashboard");
  }

  const lastBan = await prisma.ban.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      bannedBy: {
        select: {
          id: true, // on ne sélectionne plus que l'ID
        },
      },
    },
  });

  const banReason =
    lastBan?.reason?.trim() || "Aucune raison n’a été enregistrée.";

  // On stocke l’ID brut, pas de pseudo/email
  const moderatorId = lastBan?.bannedBy?.id ?? "Modération";

  const banCreatedAt = lastBan?.createdAt ?? user.createdAt;
  const banExpiresAt = lastBan?.expiresAt ?? null;
  const isPermanent = !banExpiresAt;

  return (
    <BannedView
      userId={user.id}
      banReason={banReason}
      moderatorId={moderatorId}
      banCreatedAt={fmt(banCreatedAt)}
      banExpiresAt={fmt(banExpiresAt)}
      isPermanent={isPermanent}
      actionId={lastBan?.id ?? "—"}
    />
  );
}
