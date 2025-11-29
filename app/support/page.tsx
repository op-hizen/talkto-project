// app/support/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SupportTicketsBoard from "./support-tickets-board";

export const runtime = "nodejs";

export default async function SupportPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id;

  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      },
    },
  });

  const activeCount = tickets.filter(
    (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
  ).length;

  const ticketsForClient = tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    messages: t.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      user: m.user
        ? {
            id: m.user.id,
            username: m.user.username,
            role: m.user.role,
          }
        : null,
    })),
  }));

  const displayName = session.user.username ?? session.user.email;
  const totalCount = tickets.length;

  return (
    <main className="min-h-screen text-white">
      {/* Background premium */}
      <div className="fixed inset-0 -z-10 bg-black">
        <div className="absolute inset-0 opacity-90 bg-[radial-gradient(50%_60%_at_10%_0%,rgba(56,189,248,0.16),transparent_60%),radial-gradient(50%_60%_at_90%_10%,rgba(168,85,247,0.14),transparent_60%),radial-gradient(40%_50%_at_50%_100%,rgba(16,185,129,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/85 to-black" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent)]" />
      </div>

      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[320px_1fr] md:px-6 md:py-8">
        {/* Sidebar */}
        <aside className="md:sticky md:top-6 md:h-[calc(100vh-3rem)]">
          <div className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/50 backdrop-blur-xl">
            {/* Profil */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-base font-bold">
                  {displayName?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-white/60">
                    {session.user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-wider text-white/50">
                  Tickets actifs
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {activeCount}
                  <span className="text-sm text-white/50"> / 3</span>
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-emerald-400/80"
                    style={{
                      width: `${Math.min((activeCount / 3) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-wider text-white/50">
                  Total tickets
                </p>
                <p className="mt-1 text-2xl font-semibold">{totalCount}</p>
                <p className="mt-2 text-[11px] text-white/60">
                  historique complet
                </p>
              </div>
            </div>

            {/* Aide rapide */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm font-semibold">Règles simples</p>
              <ul className="mt-2 space-y-2 text-xs text-white/70">
                <li className="flex gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                  1 sujet = 1 ticket.
                </li>
                <li className="flex gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                  Décris le contexte + étapes pour reproduire.
                </li>
                <li className="flex gap-2">
                  <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                  Ajoute une capture si nécessaire.
                </li>
              </ul>
            </div>

            {/* Footer sidebar */}
            <div className="mt-auto rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-4 text-xs text-white/60">
              Support ouvert 24/7. Temps de réponse variable selon l’affluence.
            </div>
          </div>
        </aside>

        {/* Main content */}
        <section className="flex flex-col gap-4">
          {/* Header sticky de zone */}
          <div className="sticky top-0 z-10 rounded-3xl border border-white/10 bg-black/60 p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Centre de support
                </h1>
                <p className="text-sm text-white/60">
                  Tes conversations avec l’équipe, au même endroit.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  {activeCount} actif{activeCount > 1 ? "s" : ""}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-white/70">
                  {totalCount} au total
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-white/70">
                  Limite : 3 ouverts
                </span>
              </div>
            </div>
          </div>

          {/* Board */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/40 backdrop-blur-xl md:p-6">
            <SupportTicketsBoard
              tickets={ticketsForClient}
              activeCount={activeCount}
              maxActive={3}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
