// app/ui/admin/support/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const runtime = "nodejs";

export default async function AdminSupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      username: true,
      subject: true,
      status: true,
      createdAt: true,
    },
  });

  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "OPEN").length;
  const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;
  const closed = tickets.filter((t) => t.status === "CLOSED").length;

  return (
    <section className="space-y-5">
      {/* Header + stats */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Support</h2>
          <p className="text-xs text-white/60">
            Vue globale des tickets utilisateurs, triés par date de création.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <StatPill label="Total" value={total} />
          <StatPill label="Ouverts" value={open} tone="green" />
          <StatPill label="En cours" value={inProgress} tone="amber" />
          <StatPill label="Fermés" value={closed} tone="slate" />
        </div>
      </div>

      {/* Liste */}
      <div className="rounded-3xl border border-white/10 bg-black/40">
        {tickets.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-white/50">
            Aucun ticket pour le moment.
          </div>
        ) : (
          <ul className="divide-y divide-white/8">
            {tickets.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Bloc gauche : sujet + meta user */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {t.subject}
                    </p>
                    <StatusBadge status={t.status} />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60">
                    <span className="truncate">
                      Utilisateur :{" "}
                      {t.username ?? (
                        <span className="italic text-white/40">
                          Non défini
                        </span>
                      )}
                    </span>
                    <span className="hidden truncate sm:inline">
                      Email :{" "}
                      <span className="font-mono text-[10px]">{t.email}</span>
                    </span>
                    <span className="text-white/40">
                      Créé le {formatDate(t.createdAt)}
                    </span>
                    <span className="truncate font-mono text-[10px] text-white/35">
                      ID : {t.id}
                    </span>
                  </div>
                </div>

                {/* Bloc droit : actions */}
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-[11px] text-white/50 sm:hidden">
                    {t.email}
                  </span>
                  <Link
                    href={`/ui/admin/support/${t.id}`}
                    className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:border-white/40 hover:bg-white/10 transition"
                  >
                    Détails
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ---------- UI bits / helpers ---------- */

function formatDate(date: Date) {
  return date.toLocaleString("fr-FR");
}

function StatusBadge({ status }: { status: string }) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide";

  switch (status) {
    case "OPEN":
      return (
        <span className={`${base} border-emerald-500/60 bg-emerald-500/20 text-emerald-200`}>
          Open
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className={`${base} border-amber-500/60 bg-amber-500/20 text-amber-200`}>
          In progress
        </span>
      );
    case "CLOSED":
      return (
        <span className={`${base} border-white/25 bg-white/10 text-white/70`}>
          Closed
        </span>
      );
    default:
      return (
        <span className={`${base} border-white/20 bg-white/10 text-white/70`}>
          {status}
        </span>
      );
  }
}

function StatPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "amber" | "slate";
}) {
  const base =
    "rounded-2xl border px-3 py-2 text-left bg-black/60 flex flex-col justify-center";

  const toneClasses =
    tone === "green"
      ? "border-emerald-500/40"
      : tone === "amber"
      ? "border-amber-500/40"
      : tone === "slate"
      ? "border-white/15"
      : "border-white/10";

  return (
    <div className={`${base} ${toneClasses}`}>
      <p className="text-[10px] uppercase tracking-wide text-white/45">
        {label}
      </p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
