// app/ui/admin/user/[id]/role/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const validRoles = ["ADMIN", "DEV", "MODERATOR", "SUPPORT", "USER"] as const;
type ValidRole = (typeof validRoles)[number];

export default async function AdminUserRolePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { id } = await params;
  const { next } = await searchParams;

  if (!id) notFound();

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, email: true, role: true },
  });

  if (!user) notFound();

  const nextRole = validRoles.includes(next as any)
    ? (next as ValidRole)
    : null;

  if (!nextRole) {
    return (
      <main className="min-h-screen text-white grid place-items-center px-4">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/70 p-6 backdrop-blur-xl">
          <h1 className="text-lg font-semibold">Changement de rôle</h1>
          <p className="mt-2 text-sm text-white/70">
            Rôle demandé invalide ou manquant.
          </p>
          <div className="mt-4">
            <Link
              href={`/ui/admin/user/${user.id}`}
              className="inline-flex rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white/80 hover:border-white/40 hover:bg-white/[0.1] transition"
            >
              Retour
            </Link>
          </div>
        </div>
      </main>
    );
  }

  async function changeRole(formData: FormData) {
    "use server";
    const role = formData.get("role") as string;

    if (!validRoles.includes(role as any)) {
      redirect(`/ui/admin/user/${id}?error=invalid-role`);
    }

    await prisma.user.update({
      where: { id },
      data: { role: role as ValidRole },
    });

    redirect(`/ui/admin/user/${id}?roleChanged=${role}`);
  }

  const displayName = user.username ?? user.email ?? "Utilisateur";

  return (
    <main className="min-h-screen text-white grid place-items-center px-4">
      {/* fond premium simple */}
      <div className="fixed inset-0 -z-10 bg-black">
        <div className="absolute inset-0 opacity-90 bg-[radial-gradient(50%_60%_at_10%_0%,rgba(56,189,248,0.12),transparent_60%),radial-gradient(50%_60%_at_90%_10%,rgba(168,85,247,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/85 to-black" />
      </div>

      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-black/70 p-6 shadow-2xl backdrop-blur-xl">
        <h1 className="text-lg font-semibold">Changer le rôle</h1>
        <p className="mt-2 text-sm text-white/70">
          Tu es sur le point de modifier le rôle de :
        </p>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
          <p className="font-semibold truncate">{displayName}</p>
          <p className="text-xs text-white/60 mt-1">
            ID : <span className="font-mono">{user.id}</span>
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1">
              Actuel : <span className="font-mono">{user.role}</span>
            </span>
            <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-1 text-sky-200">
              Nouveau : <span className="font-mono">{nextRole}</span>
            </span>
          </div>
        </div>

        <form action={changeRole} className="mt-5 flex items-center justify-end gap-2">
          <input type="hidden" name="role" value={nextRole} />

          <Link
            href={`/ui/admin/user/${user.id}`}
            className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 hover:border-white/40 hover:bg-white/[0.08] transition"
          >
            Annuler
          </Link>

          <button
            type="submit"
            className="rounded-2xl border border-white/15 bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/90 transition"
          >
            Confirmer le changement
          </button>
        </form>

        <p className="mt-3 text-[11px] text-white/50">
          Le changement prend effet immédiatement.
        </p>
      </div>
    </main>
  );
}
