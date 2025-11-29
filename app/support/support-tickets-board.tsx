// app/support/support-tickets-board.tsx
"use client";

import { useMemo, useState } from "react";
import SupportForm from "./support-form";
import SupportConversation from "./support-conversation";

type Role =
  | "ADMIN"
  | "DEV"
  | "MODERATOR"
  | "SUPPORT"
  | "MEMBER"
  | "TRIAL"
  | "GUEST";

type TicketClient = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  messages: {
    id: string;
    body: string;
    createdAt: string;
    user: {
      id: string;
      username: string | null;
      role: Role;
    } | null;
  }[];
};

function statusMeta(status: string) {
  switch (status) {
    case "OPEN":
      return {
        label: "Ouvert",
        dot: "bg-emerald-400",
        badge: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
      };
    case "IN_PROGRESS":
      return {
        label: "En cours",
        dot: "bg-sky-400",
        badge: "border-sky-400/30 bg-sky-500/10 text-sky-200",
      };
    case "WAITING_USER":
      return {
        label: "Action requise",
        dot: "bg-amber-400",
        badge: "border-amber-400/30 bg-amber-500/10 text-amber-200",
      };
    case "CLOSED":
      return {
        label: "Fermé",
        dot: "bg-white/40",
        badge: "border-white/10 bg-white/[0.03] text-white/70",
      };
    default:
      return {
        label: status,
        dot: "bg-white/40",
        badge: "border-white/10 bg-white/[0.03] text-white/70",
      };
  }
}

function formatDateFr(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function SupportTicketsBoard({
  tickets,
  activeCount,
  maxActive,
}: {
  tickets: TicketClient[];
  activeCount: number;
  maxActive: number;
}) {
  const defaultSelectedId = useMemo(() => {
    const active = tickets.filter(
      (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
    );
    if (active.length > 0) return active[0].id;
    if (tickets.length > 0) return tickets[0].id;
    return null;
  }, [tickets]);

  const [selectedId, setSelectedId] = useState<string | null>(defaultSelectedId);

  const selectedTicket = tickets.find((t) => t.id === selectedId) || null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[360px_1fr]">
      {/* LISTE TICKETS */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-3 md:p-4">
        {/* Header sticky */}
        <div className="sticky top-0 z-[1] rounded-xl bg-black/60 p-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">
              Tes tickets
            </h2>
            <span className="text-[11px] text-white/60">
              {tickets.length} total
            </span>
          </div>

          {/* Barre mini stats */}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-white/70">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/90" />
            <span>{activeCount} actif{activeCount > 1 ? "s" : ""}</span>
            <span className="text-white/30">•</span>
            <span>limite {maxActive}</span>
          </div>
        </div>

        {/* Liste scroll */}
        <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1 md:max-h-[520px]">
          {tickets.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/60">
              Aucun ticket pour le moment. Crée-en un juste en dessous.
            </div>
          )}

          {tickets.map((t) => {
            const isSelected = selectedTicket?.id === t.id;
            const isActive =
              t.status === "OPEN" || t.status === "IN_PROGRESS";

            const meta = statusMeta(t.status);
            const lastMsg = t.messages[t.messages.length - 1];
            const lastPreview =
              lastMsg?.body?.slice(0, 72) ?? "Aucun message";

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={[
                  "group w-full rounded-xl border p-3 text-left text-xs transition",
                  "bg-black/40 hover:border-white/25 hover:bg-black/50",
                  isSelected
                    ? "border-white/30 bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_10px_30px_-10px_rgba(0,0,0,0.8)]"
                    : "border-white/10",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-[13px] font-semibold">
                    {t.subject}
                  </p>

                  <div
                    className={[
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px]",
                      meta.badge,
                    ].join(" ")}
                  >
                    {meta.label}
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-2 text-[11px] text-white/55">
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  <span>Créé {formatDateFr(t.createdAt)}</span>
                  {isActive && (
                    <>
                      <span className="text-white/30">•</span>
                      <span className="text-emerald-200/90">actif</span>
                    </>
                  )}
                </div>

                <p className="mt-2 line-clamp-2 text-[11px] text-white/70">
                  {lastPreview}
                </p>

                <div className="mt-2 flex items-center justify-between text-[10px] text-white/45">
                  <span>{t.messages.length} message{t.messages.length > 1 ? "s" : ""}</span>
                  <span className="opacity-0 transition group-hover:opacity-100">
                    Ouvrir →
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Nouveau ticket */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-3">
          {activeCount < maxActive ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-white/90">
                  Nouveau ticket
                </p>
                <p className="text-[11px] text-white/60">
                  max {maxActive} en cours
                </p>
              </div>
              <SupportForm />
            </>
          ) : (
            <p className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-2">
              Tu as déjà {maxActive} tickets actifs.
              Ferme-en un avant d’en créer un nouveau.
            </p>
          )}
        </div>
      </div>

      {/* CONVERSATION */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-3 md:p-4">
        {selectedTicket ? (
          <>
            {/* Header conversation */}
            <div className="mb-3 rounded-xl border border-white/10 bg-black/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {selectedTicket.subject}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/55">
                    Ticket créé {formatDateFr(selectedTicket.createdAt)}
                  </p>
                </div>

                <div
                  className={[
                    "rounded-full border px-2 py-1 text-[10px]",
                    statusMeta(selectedTicket.status).badge,
                  ].join(" ")}
                >
                  {statusMeta(selectedTicket.status).label}
                </div>
              </div>
            </div>

            <SupportConversation ticket={selectedTicket} />
          </>
        ) : (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
            <div className="max-w-sm">
              <p className="text-sm font-semibold">Aucun ticket sélectionné</p>
              <p className="mt-1 text-xs text-white/60">
                Crée un ticket via le formulaire à gauche pour démarrer une
                conversation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
