// app/ui/admin/support/[id]/ticket-conversation.tsx
"use client";

import { useState } from "react";

type Role =
  | "ADMIN"
  | "DEV"
  | "MODERATOR"
  | "SUPPORT"
  | "MEMBER"
  | "TRIAL"
  | "GUEST";

type TicketForAdmin = {
  id: string;
  status: string;
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

export default function AdminTicketConversation({
  ticket,
}: {
  ticket: TicketForAdmin;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReply = ticket.status !== "CLOSED";

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, message }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Erreur inconnue.");
        setSending(false);
        return;
      }

      setMessage("");
      setSending(false);
      window.location.reload();
    } catch (err) {
      setError("Erreur réseau.");
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-3 text-xs">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Conversation</p>
        <p className="text-[11px] text-white/60">
          Statut : <span className="font-mono">{ticket.status}</span>
        </p>
      </div>

      <div className="flex-1 border border-white/10 rounded-lg p-3 bg-black/40 max-h-72 overflow-y-auto space-y-2">
        {ticket.messages.length === 0 && (
          <p className="text-xs text-white/50">
            Pas encore de messages sur ce ticket.
          </p>
        )}
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className="border border-white/10 rounded-lg px-3 py-2 bg-white/5"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[11px]">
                  {m.user?.username ?? "Utilisateur supprimé"}
                </span>
                {m.user && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${getRoleBadgeClass(
                      m.user.role
                    )}`}
                  >
                    {m.user.role}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-white/50">
                {new Date(m.createdAt).toLocaleString("fr-FR")}
              </span>
            </div>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className="space-y-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={!canReply}
          className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/20 focus:outline-none focus:border-white/50 text-xs min-h-[80px] disabled:opacity-50"
          placeholder={
            canReply
              ? "Répondre à l’utilisateur..."
              : "Ticket clôturé, tu ne peux plus répondre."
          }
        />
        <button
          type="submit"
          disabled={!canReply || sending || !message.trim()}
          className="px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs"
        >
          {sending ? "Envoi..." : "Envoyer"}
        </button>
      </form>
    </div>
  );
}

function getRoleBadgeClass(role: Role) {
  switch (role) {
    case "ADMIN":
      return "bg-red-500/20 border border-red-500/40 text-red-300";
    case "DEV":
      return "bg-purple-500/20 border border-purple-500/40 text-purple-300";
    case "MODERATOR":
      return "bg-blue-500/20 border border-blue-500/40 text-blue-300";
    case "SUPPORT":
      return "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300";
    case "MEMBER":
      return "bg-white/10 border border-white/30 text-white/80";
    case "TRIAL":
      return "bg-amber-500/20 border border-amber-500/40 text-amber-300";
    case "GUEST":
    default:
      return "bg-white/5 border border-white/20 text-white/60";
  }
}
