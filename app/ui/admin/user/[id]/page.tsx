// app/ui/admin/user/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminUserActions from "../../admin-user-actions";

export const runtime = "nodejs";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) notFound();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      bans: {
        orderBy: { createdAt: "desc" },
        include: { bannedBy: { select: { id: true } } },
      },
      supportTickets: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) notFound();

  const lastBan = user.bans[0] ?? null;
  const tickets = user.supportTickets;

  const ticketsForSummary = tickets.slice(0, 5);
  const openTicketsInSummary = ticketsForSummary.filter(
    (t) => t.status !== "CLOSED"
  ).length;

  const isBanned = user.accessStatus === "BANNED";
  const displayName = user.username ?? user.email ?? "Utilisateur";

  return (
    <main className="min-h-screen text-white">
      {/* Background premium */}
      <div className="fixed inset-0 -z-10 bg-black">
        <div className="absolute inset-0 opacity-90 bg-[radial-gradient(50%_60%_at_10%_0%,rgba(56,189,248,0.14),transparent_60%),radial-gradient(50%_60%_at_90%_10%,rgba(168,85,247,0.12),transparent_60%),radial-gradient(40%_50%_at_50%_100%,rgba(16,185,129,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/85 to-black" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent)]" />
      </div>

      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8 space-y-6">
        {/* Header sticky */}
        <header className="sticky top-0 z-10 rounded-3xl border border-white/10 bg-black/60 p-4 md:p-5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Bloc user */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <img
                  src="/default-avatar.png"
                  alt={displayName}
                  className="h-16 w-16 rounded-2xl border border-white/15 object-cover bg-black"
                />
                {isBanned && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide">
                    BAN
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {displayName}
                </h1>
                <p className="text-xs text-white/60">
                  ID : <span className="font-mono">{user.id}</span>
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 font-semibold uppercase tracking-wide">
                    Rôle : <span className="font-mono">{user.role}</span>
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-0.5 font-semibold uppercase tracking-wide border ${getAccessStatusPill(
                      user.accessStatus
                    )}`}
                  >
                    Statut :{" "}
                    <span className="font-mono">{user.accessStatus}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions inline + modal */}
            <div className="flex flex-wrap items-center gap-2">
              <AdminUserActions
                userId={user.id}
                isBanned={isBanned}
                currentRole={user.role}
                showDetails={false}
              />

              <Link
                href={`/ui/admin/support?userId=${user.id}`}
                className="rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/80 hover:border-white/40 hover:bg-white/[0.08] transition"
              >
                Tickets support
              </Link>

              <Link
                href={`/profile?userId=${user.id}`}
                className="rounded-2xl border border-white/10 bg-black/70 px-4 py-2 text-xs font-semibold text-white/70 hover:border-white/40 hover:bg-black/90 transition"
              >
                Voir profil public
              </Link>
            </div>
          </div>
        </header>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Tickets récents" value={tickets.length} hint="10 derniers" />
          <StatCard label="Tickets ouverts" value={openTicketsInSummary} hint="sur 5 récents" accent="amber" />
          <StatCard label="Nb bans" value={user.bans.length} hint="total" accent="red" />
          <StatCard
            label="Dernier pseudo change"
            value={user.lastUsernameChangeAt ? 1 : 0}
            hint={user.lastUsernameChangeAt ? formatDate(user.lastUsernameChangeAt) : "jamais"}
            accent="sky"
          />
        </div>

        {/* Layout 2 colonnes */}
        <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          {/* Colonne gauche */}
          <div className="space-y-5">
            <Card>
              <CardHeader title="Infos de base" />
              <div className="grid gap-2 text-xs text-white/80">
                <Row label="Email">
                  {user.email ?? (
                    <span className="italic text-white/40">Aucun email</span>
                  )}
                </Row>
                <Row label="Pseudo">
                  {user.username ?? (
                    <span className="italic text-white/40">Aucun pseudo</span>
                  )}
                </Row>
                <Row label="Créé le">{formatDate(user.createdAt)}</Row>
                <Row label="Dernier changement pseudo">
                  {user.lastUsernameChangeAt
                    ? formatDate(user.lastUsernameChangeAt)
                    : "Jamais"}
                </Row>
              </div>
            </Card>

            <Card>
              <CardHeader title="Statut / Ban actuel" />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <MiniStat
                  label="Statut accès"
                  value={user.accessStatus}
                  hint={isBanned ? "accès bloqué" : "accès OK"}
                />
                <MiniStat
                  label="Ban actif depuis"
                  value={lastBan ? formatDate(lastBan.createdAt) : "—"}
                  hint="dernière sanction"
                />
                <MiniStat
                  label="Fin de ban"
                  value={
                    lastBan
                      ? lastBan.expiresAt
                        ? formatDate(lastBan.expiresAt)
                        : "Permanent"
                      : "—"
                  }
                  hint="expiration"
                />
                <MiniStat
                  label="Accès avant ban"
                  value={lastBan?.previousAccessStatus ?? "—"}
                  hint="historique"
                />
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Tickets récents"
                right={
                  <span className="text-[11px] text-white/50">
                    {tickets.length} tickets
                  </span>
                }
              />

              {tickets.length === 0 ? (
                <Empty text="Aucun ticket de support pour cet utilisateur." />
              ) : (
                <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3 text-xs">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-white/10 bg-black/60 p-3 hover:bg-black/70 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold line-clamp-1">
                            {t.subject}
                          </p>
                          <p className="mt-1 text-[11px] text-white/60">
                            Créé le {formatDate(t.createdAt)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide border ${getTicketStatusPill(
                            t.status
                          )}`}
                        >
                          {t.status}
                        </span>
                      </div>

                      {t.message && (
                        <p className="mt-2 text-[11px] text-white/70 line-clamp-2">
                          {t.message}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between">
                        <p className="font-mono text-[10px] text-white/40 truncate">
                          ID: {t.id}
                        </p>
                        <Link
                          href={`/ui/admin/support/${t.id}`}
                          className="text-[11px] font-semibold text-sky-300 hover:underline"
                        >
                          Détails →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Colonne droite */}
          <div className="space-y-5">
            <Card>
              <CardHeader
                title="Sanctions & bans"
                right={
                  <span className="text-[11px] text-white/50">
                    {user.bans.length} entrées
                  </span>
                }
              />
              {user.bans.length === 0 ? (
                <Empty text="Aucune sanction enregistrée." />
              ) : (
                <div className="max-h-[720px] overflow-y-auto pr-1 space-y-3 text-xs">
                  {user.bans.map((ban, i) => {
                    const permanent = !ban.expiresAt;
                    return (
                      <div
                        key={ban.id}
                        className="rounded-2xl border border-white/10 bg-black/60 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-[11px] text-white/60">
                            #{i + 1} • {ban.id}
                          </p>
                          <span
                            className={`rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide ${
                              permanent
                                ? "bg-red-600 text-white"
                                : "bg-amber-500/90 text-black"
                            }`}
                          >
                            {permanent ? "Permanent" : "Temporaire"}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1.5">
                          <Line label="Raison">{ban.reason}</Line>
                          <Line label="Créé le">{formatDate(ban.createdAt)}</Line>
                          <Line label="Expire">
                            {ban.expiresAt
                              ? formatDate(ban.expiresAt)
                              : "Jamais"}
                          </Line>
                          <Line label="Modérateur (ID)">
                            {ban.bannedBy?.id ?? "Inconnu"}
                          </Line>
                          <Line label="Alias au moment du ban">
                            {user.username ?? "—"}
                          </Line>
                          <Line label="Accès avant ban">
                            {ban.previousAccessStatus ?? "—"}
                          </Line>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- UI Bits ---------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-xl shadow-black/40 backdrop-blur-xl">
      {children}
    </div>
  );
}

function CardHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold">{title}</h3>
      {right}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: "emerald" | "amber" | "sky" | "red";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : accent === "amber"
      ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
      : accent === "sky"
      ? "border-sky-400/20 bg-sky-500/10 text-sky-100"
      : accent === "red"
      ? "border-red-400/20 bg-red-500/10 text-red-100"
      : "border-white/10 bg-white/[0.03] text-white";

  return (
    <div className={`rounded-2xl border p-4 ${accentClass}`}>
      <p className="text-[11px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-[11px] opacity-70">{hint}</p>}
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
      <p className="text-[11px] text-white/50">{label}</p>
      <p className="mt-1 text-[13px] font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/40 p-5 text-center text-xs text-white/60">
      {text}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 pb-2 last:border-none last:pb-0">
      <span className="text-white/50">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex justify-between gap-4">
      <span className="text-white/50">{label}</span>
      <span className="text-right text-white/85">{children}</span>
    </p>
  );
}

/* ---------- Helpers ---------- */

function formatDate(date: Date) {
  return date.toLocaleString("fr-FR");
}

function getAccessStatusPill(status: string) {
  switch (status) {
    case "MEMBER":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
    case "TRIAL":
      return "border-amber-500/40 bg-amber-500/15 text-amber-300";
    case "BANNED":
      return "border-red-500/60 bg-red-500/20 text-red-300";
    default:
      return "border-white/25 bg-white/10 text-white/80";
  }
}

function getTicketStatusPill(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
    case "IN_PROGRESS":
      return "bg-amber-500/20 text-amber-300 border-amber-500/50";
    case "CLOSED":
      return "bg-white/10 text-white/70 border-white/25";
    default:
      return "bg-white/10 text-white/70 border-white/20";
  }
}
