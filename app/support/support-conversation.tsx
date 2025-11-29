// app/support/support-conversation.tsx
"use client";

import { useMemo, useState } from "react";

type Role =
  | "ADMIN"
  | "DEV"
  | "MODERATOR"
  | "SUPPORT"
  | "MEMBER"
  | "TRIAL"
  | "GUEST";

type MessageClient = {
  id: string;
  body: string;
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    role: Role;
  } | null;
  // champ local (optimiste) : pas envoyé/stocké en DB
  optimistic?: boolean;
};

type TicketWithMessages = {
  id: string;
  subject: string;
  status: string;
  messages: MessageClient[];
};

function isStaff(role?: Role | null) {
  return (
    role === "ADMIN" ||
    role === "DEV" ||
    role === "MODERATOR" ||
    role === "SUPPORT"
  );
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

export default function SupportConversation({
  ticket,
}: {
  ticket: TicketWithMessages;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ On copie les messages du ticket en state local
  const [messages, setMessages] = useState<MessageClient[]>(
    ticket.messages ?? []
  );

  const canReply = ticket.status !== "CLOSED";

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    setError(null);

    const tempId = `temp_${Date.now()}`;

    // ✅ message optimiste
    const optimisticMsg: MessageClient = {
      id: tempId,
      body: message,
      createdAt: new Date().toISOString(),
      user: {
        id: "me",
        username: "Moi",
        role: "MEMBER",
      },
      optimistic: true,
    };

    // 1) on l’affiche direct
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessage("");

    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.id, message: optimisticMsg.body }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // 2) on annule l’optimiste si erreur
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(data?.error || "Erreur inconnue.");
        setSending(false);
        return;
      }

      // 3) on remplace le message optimiste par celui du serveur si dispo
      const serverMsg =
        data?.message ||
        data?.newMessage ||
        data?.createdMessage ||
        null;

      if (serverMsg?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: serverMsg.id,
                  body: serverMsg.body ?? m.body,
                  createdAt: serverMsg.createdAt ?? m.createdAt,
                  user: serverMsg.user ?? m.user,
                }
              : m
          )
        );
      } else {
        // si API ne renvoie rien d’utilisable
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, optimistic: false } : m
          )
        );
      }

      setSending(false);
    } catch {
      // 4) erreur réseau -> on retire l’optimiste
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError("Erreur réseau.");
      setSending(false);
    }
  };

  const messagesWithDay = useMemo(() => {
    let lastDay = "";
    return messages.map((m) => {
      const day = new Date(m.createdAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      const showDay = day !== lastDay;
      lastDay = day;
      return { ...m, day, showDay };
    });
  }, [messages]);

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      {/* Mini header */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{ticket.subject}</p>
          <p className="text-[11px] text-white/60">
            Statut :{" "}
            <span className="font-mono text-white/80">{ticket.status}</span>
          </p>
        </div>
        <div className="text-[10px] text-white/60">
          {messages.length} message{messages.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/30 p-3 md:p-4">
        {messages.length === 0 && (
          <div className="grid place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
            <div>
              <p className="text-sm font-semibold">Pas encore de réponse</p>
              <p className="mt-1 text-xs text-white/60">
                Décris ton problème, l’équipe répondra ici.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messagesWithDay.map((m) => {
            const staff = isStaff(m.user?.role);
            const username = m.user?.username ?? "Utilisateur supprimé";
            const role = m.user?.role;

            return (
              <div key={m.id} className="space-y-2">
                {m.showDay && (
                  <div className="sticky top-0 z-[1] flex justify-center">
                    <span className="rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[10px] text-white/60 backdrop-blur">
                      {m.day}
                    </span>
                  </div>
                )}

                <div className={`flex ${staff ? "justify-start" : "justify-end"}`}>
                  <div
                    className={[
                      "group max-w-[85%] rounded-2xl border px-3 py-2 text-xs leading-relaxed shadow-sm",
                      staff
                        ? "border-white/10 bg-white/[0.06]"
                        : "border-emerald-400/20 bg-emerald-500/10",
                      m.optimistic ? "opacity-70" : "opacity-100",
                    ].join(" ")}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "text-[11px] font-semibold",
                            staff ? "text-white/90" : "text-emerald-100",
                          ].join(" ")}
                        >
                          {username}
                        </span>

                        {role && (
                          <span
                            className={[
                              "rounded-full px-1.5 py-0.5 text-[10px] font-mono",
                              getRoleBadgeClass(role),
                            ].join(" ")}
                          >
                            {role}
                          </span>
                        )}

                        {m.optimistic && (
                          <span className="text-[10px] text-white/50">
                            envoi…
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-white/50">
                        {formatDateFr(m.createdAt)}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-white/90">
                      {m.body}
                    </p>

                    <div
                      className={[
                        "mt-2 h-1 w-10 rounded-full opacity-30",
                        staff ? "bg-white" : "bg-emerald-300",
                      ].join(" ")}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="mt-3 rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur"
      >
        <div className="flex flex-col gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!canReply}
            className="w-full resize-none rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white/90 placeholder:text-white/40 focus:outline-none focus:border-white/40 disabled:opacity-50"
            placeholder={
              canReply
                ? "Écris ta réponse au support…"
                : "Ce ticket est clôturé, tu ne peux plus répondre."
            }
            rows={3}
          />

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/50">
              Donne du contexte + étapes, ça accélère tout.
            </p>

            <button
              type="submit"
              disabled={!canReply || sending || !message.trim()}
              className={[
                "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition",
                "border-white/15 bg-white/[0.04] hover:border-white/35 hover:bg-white/[0.07]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-2 w-2 rounded-full",
                  sending ? "bg-amber-400 animate-pulse" : "bg-emerald-400",
                ].join(" ")}
              />
              {sending ? "Envoi..." : "Envoyer"}
            </button>
          </div>
        </div>
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
