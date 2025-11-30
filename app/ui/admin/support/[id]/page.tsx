// app/ui/admin/support/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import AdminTicketConversation from "./ticket-conversation";

export const runtime = "nodejs";

export default async function AdminSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          accessStatus: true,
          email: true,
        },
      },
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

  if (!ticket) notFound();

  const requester =
    ticket.username ??
    ticket.user?.username ??
    ticket.email ??
    "Utilisateur inconnu";

  const isLinkedToUser = !!ticket.user;

  // ✅ NORMALISATION pour matcher TicketForAdmin
  const ticketForAdmin = {
    ...ticket,
    status: ticket.status as any,
    createdAt: ticket.createdAt.toISOString(),
    user: ticket.user
      ? {
          ...ticket.user,
          role: ticket.user.role as any,
          accessStatus: ticket.user.accessStatus as any,
        }
      : null,
    messages: ticket.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      user: m.user
        ? {
            id: m.user.id,
            username: m.user.username,
            role: m.user.role as any,
          }
        : null,
    })),
  };

  return (
    <section className="space-y-6">
      {/* HEADER CARD */}
      <div className="rounded-3xl border border-white/10 bg-black/40 px-6 py-5 shadow-[0_18px_70px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* LEFT : subject / requester / meta */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold line-clamp-2">
                {ticket.subject}
              </h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusPill(
                  ticket.status
                )}`}
              >
                {ticket.status}
              </span>
            </div>

            <p className="text-xs text-white/70">
              Créé le{" "}
              <span className="font-mono">{formatDate(ticket.createdAt)}</span>
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/70">
              <span>
                <span className="text-white/50">ID ticket :</span>{" "}
                <span className="font-mono">{ticket.id}</span>
              </span>
              <span>
                <span className="text-white/50">Demandeur :</span>{" "}
                <span className="font-semibold">{requester}</span>
              </span>
              <span>
                <span className="text-white/50">Email :</span>{" "}
                <span>{ticket.email}</span>
              </span>
              {isLinkedToUser && (
                <span className="inline-flex items-center gap-1">
                  <span className="text-white/50">Compte lié :</span>
                  <span className="rounded-full border border-white/20 bg-white/5 px-2 py-[2px] font-mono text-[10px]">
                    {ticket.user!.id}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* RIGHT : quick actions */}
          <div className="flex flex-wrap items-center gap-3 justify-end">
            {isLinkedToUser && (
              <Link
                href={`/ui/admin/user/${ticket.user!.id}`}
                className="rounded-full border border-white/25 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 hover:border-white/50 hover:bg-white/10 transition"
              >
                Ouvrir la fiche user
              </Link>
            )}

            <Link
              href="/ui/admin/support"
              className="rounded-full border border-white/15 bg-black/70 px-4 py-2 text-xs font-semibold text-white/70 hover:border-white/40 hover:bg-black/90 transition"
            >
              Retour à la liste
            </Link>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        {/* Conversation */}
        <div className="rounded-3xl border border-white/10 bg-black/40 px-4 py-4 lg:px-5 lg:py-5">
          <div className="mb-3 flex items-center justify-between text-xs text-white/60">
            <p>
              Conversation •{" "}
              <span className="font-mono">
                {ticket.messages.length} message
                {ticket.messages.length > 1 ? "s" : ""}
              </span>
            </p>
            <p className="hidden sm:block">
              Les messages staff sont distingués par leur badge de rôle.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/60 px-3 py-3 lg:px-4 lg:py-4">
            {/* ✅ on passe la version normalisée */}
            <AdminTicketConversation ticket={ticketForAdmin as any} />
          </div>
        </div>

        {/* SIDE PANEL : meta + status form */}
        <aside className="space-y-4">
          {/* Infos ticket */}
          <div className="rounded-3xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-white/80">
            <h3 className="mb-3 text-sm font-semibold">Détails du ticket</h3>
            <div className="space-y-1.5">
              <Row label="Sujet">
                <span className="line-clamp-2">{ticket.subject}</span>
              </Row>
              <Row label="Demandeur">{requester}</Row>
              {ticket.user && (
                <Row label="Rôle user">
                  <span className="font-mono">{ticket.user.role}</span>
                </Row>
              )}
              {ticket.user && (
                <Row label="Statut d&apos;accès">
                  <span className="font-mono">{ticket.user.accessStatus}</span>
                </Row>
              )}
              <Row label="Créé le">{formatDate(ticket.createdAt)}</Row>
              <Row label="ID ticket">
                <span className="font-mono">{ticket.id}</span>
              </Row>
            </div>
          </div>

          {/* Status / actions */}
          <form
            action={updateTicketStatus}
            className="rounded-3xl border border-white/10 bg-black/40 px-5 py-4 space-y-4 text-xs"
          >
            <input type="hidden" name="id" value={ticket.id} />

            <div className="space-y-1">
              <label className="block text-sm font-semibold">
                Mettre à jour le statut
              </label>
              <select
                name="status"
                defaultValue={ticket.status}
                className="w-full rounded-xl border border-white/20 bg-black/70 px-3 py-2 text-sm outline-none focus:border-white/60"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="CLOSED">CLOSED</option>
              </select>
              <p className="text-[11px] text-white/45">
                Utilise <span className="font-mono">IN_PROGRESS</span> pendant
                le traitement, et <span className="font-mono">CLOSED</span> une
                fois la conversation terminée.
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/25 transition"
            >
              Enregistrer le statut
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}

async function updateTicketStatus(formData: FormData) {
  "use server";

  const id = formData.get("id") as string;
  const status = formData.get("status") as string;

  if (!id || !status) redirect("/ui/admin/support");
  if (!["OPEN", "IN_PROGRESS", "CLOSED"].includes(status)) {
    redirect(`/ui/admin/support/${id}`);
  }

  await prisma.supportTicket.update({
    where: { id },
    data: { status: status as any },
  });

  redirect(`/ui/admin/support/${id}`);
}

/* ---------- Helpers UI ---------- */

function formatDate(date: Date) {
  return date.toLocaleString("fr-FR");
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-white/50">{label}</span>
      <span className="text-right">{children}</span>
    </p>
  );
}

function getStatusPill(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50";
    case "IN_PROGRESS":
      return "bg-amber-500/20 text-amber-200 border border-amber-500/60";
    case "CLOSED":
      return "bg-white/10 text-white/70 border border-white/25";
    default:
      return "bg-white/10 text-white/70 border border-white/20";
  }
}
