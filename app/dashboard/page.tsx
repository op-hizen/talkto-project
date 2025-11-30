// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      username: true,
      role: true,
      accessStatus: true,
    },
  });

  if (!user) redirect("/login");
  if (user.accessStatus === "BANNED") redirect("/banned");
  if (!user.username) redirect("/u/username");

  const isAdmin =
    user.role === "ADMIN" ||
    user.role === "DEV" ||
    user.role === "MODERATOR" ||
    user.role === "SUPPORT";

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="p-8 rounded-2xl border border-white/10 bg-white/5 space-y-4 w-full max-w-xl">
        <div className="space-y-1">
          <p className="text-lg">
            Connecté(e) en tant que{" "}
            <span className="font-semibold">{user.username}</span>
          </p>
          <p className="text-sm text-white/70">
            Rôle : <span className="font-mono">{user.role}</span> · Statut :{" "}
            <span className="font-mono">{user.accessStatus}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm items-center">
          <a
            href="/profile"
            className="px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition"
          >
            Mon profil
          </a>

          <a
            href="/support"
            className="px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition"
          >
            Support
          </a>

          {isAdmin && (
            <a
              href="/ui/admin"
              className="px-3 py-1.5 rounded-lg border border-emerald-400/60 text-emerald-300 hover:border-emerald-300 transition"
            >
              Panel admin
            </a>
          )}

          {/* Bouton de déconnexion */}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/logout" });
            }}
            className="ml-auto"
          >
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg border border-red-500/70 text-red-300 hover:border-red-400 hover:text-red-200 transition text-sm"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
