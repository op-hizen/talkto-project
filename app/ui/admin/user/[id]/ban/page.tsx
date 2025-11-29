// app/ui/admin/user/[id]/ban/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { pusher } from "@/lib/pusher";

export const runtime = "nodejs";

const DURATIONS = [
  { label: "1 heure", ms: 1 * 60 * 60 * 1000 },
  { label: "12 heures", ms: 12 * 60 * 60 * 1000 },
  { label: "24 heures", ms: 24 * 60 * 60 * 1000 },
  { label: "7 jours", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "1 mois", ms: 30 * 24 * 60 * 60 * 1000 },
];

export default async function BanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: targetId } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const moderatorId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, username: true, accessStatus: true },
  });

  if (!user) redirect("/ui/admin");

  if (user.accessStatus === "BANNED") {
    redirect(`/ui/admin/user/${user.id}`);
  }

  return (
    <form
      action={banUser}
      className="space-y-4 max-w-md mt-10 border border-white/10 p-6 rounded-2xl bg-white/5"
    >
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="moderatorId" value={moderatorId} />

      <h1 className="text-xl font-semibold">Bannir {user.username}</h1>

      <div>
        <label className="block text-sm mb-1">Raison</label>
        <textarea
          name="reason"
          required
          className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg"
        ></textarea>
      </div>

      <div>
        <label className="block text-sm mb-1">Durée</label>
        <select
          name="duration"
          className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg"
        >
          <option value="0">Permanent</option>
          {DURATIONS.map((d) => (
            <option key={d.label} value={d.ms}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <button className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
        Bannir
      </button>
    </form>
  );
}

async function banUser(formData: FormData) {
  "use server";

  const userId = formData.get("userId") as string;
  const moderatorId = formData.get("moderatorId") as string;
  const reason = formData.get("reason") as string;
  const duration = parseInt(formData.get("duration") as string);

  // Récupérer le user pour savoir son statut actuel
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accessStatus: true },
  });

  if (!user) {
    redirect("/ui/admin");
  }

  let expiresAt: Date | null = null;
  if (duration > 0) {
    expiresAt = new Date(Date.now() + duration);
  }

  // Créer un ban en gardant l'ancien statut
  await prisma.ban.create({
    data: {
      userId,
      reason,
      expiresAt,
      bannedById: moderatorId,
      previousAccessStatus: user!.accessStatus,
    },
  });

  // Mettre à jour l'utilisateur -> BANNED
  await prisma.user.update({
    where: { id: userId },
    data: { accessStatus: "BANNED" },
  });

  // 🔥 Event temps réel vers le client
  await pusher.trigger(`user-${userId}`, "ban", {
    reason,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  });

  redirect(`/ui/admin/user/${userId}`);
}
