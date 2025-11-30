// app/chat/RoomList.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type RoomItem = {
  id: string;
  name: string | null;
  isDirect: boolean;
  unreadCount?: number; // ✅ nouveau (optionnel)
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      username: string | null;
    };
  } | null;
  participants: {
    id: string;
    username: string | null;
    email: string | null;
  }[];
};

function initials(name: string) {
  const s = name.trim();
  if (!s) return "?";
  const parts = s.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function RoomList({
  rooms,
  currentUserId,
}: {
  rooms: RoomItem[];
  currentUserId: string;
}) {
  const pathname = usePathname();

  if (!rooms.length) {
    return (
      <div className="flex-1 grid place-items-center px-6 text-center">
        <div className="max-w-[240px]">
          <div className="mx-auto mb-3 h-10 w-10 rounded-2xl bg-white/5 ring-1 ring-white/10 grid place-items-center">
            <span className="text-lg">💬</span>
          </div>
          <p className="text-sm text-slate-300">Aucune conversation.</p>
          <p className="text-xs text-slate-500 mt-1">
            Lance un nouveau message pour démarrer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5">
      {rooms.map((room) => {
        const href = `/chat/${room.id}`;
        const isActive = pathname === href;

        const otherParticipants = room.participants.filter(
          (p) => p.id !== currentUserId
        );

        const labelFromDirect =
          room.isDirect && otherParticipants.length
            ? otherParticipants
                .map((p) => p.username ?? p.email ?? "Sans nom")
                .join(", ")
            : null;

        const title =
          room.name ||
          labelFromDirect ||
          `Salon ${room.id.slice(0, 6)}…`;

        const last = room.lastMessage;
        const lastPreview = last
          ? last.content.length > 70
            ? last.content.slice(0, 67) + "…"
            : last.content
          : "Aucun message";

        const lastTime = last
          ? new Date(last.createdAt).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;

        const avatarLabel =
          (labelFromDirect || title || "Salon").split(",")[0];

        const unread = room.unreadCount ?? 0;

        return (
          <Link
            key={room.id}
            href={href}
            className={[
              "group block rounded-xl px-2.5 py-2 transition-all duration-200",
              "ring-1 ring-transparent hover:ring-white/10",
              isActive
                ? "bg-white/8 ring-white/12 shadow-sm"
                : "hover:bg-white/5",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="relative">
                <div
                  className={[
                    "h-9 w-9 rounded-xl grid place-items-center text-xs font-semibold",
                    "bg-gradient-to-b from-white/10 to-white/5 ring-1 ring-white/10",
                    isActive ? "text-white" : "text-slate-200",
                  ].join(" ")}
                >
                  {initials(avatarLabel)}
                </div>

                {/* Badge unread (dot/compteur) */}
                {unread > 0 && (
                  <div
                    className="
                      absolute -top-1 -right-1 min-w-[18px] h-[18px]
                      px-1 rounded-full grid place-items-center
                      text-[10px] font-bold text-white
                      bg-indigo-500 ring-2 ring-slate-950
                    "
                    aria-label={`${unread} messages non lus`}
                  >
                    {unread > 99 ? "99+" : unread}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium text-slate-100">
                    {title}
                  </div>

                  <div className="flex items-center gap-2">
                    {lastTime && (
                      <div className="text-[11px] text-slate-500 flex-shrink-0">
                        {lastTime}
                      </div>
                    )}

                    {/* Petit dot en bonus si unread mais tu ne veux pas de compteur */}
                    {unread > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/90 shadow-[0_0_8px_rgba(99,102,241,0.9)]" />
                    )}
                  </div>
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span
                    className={[
                      "truncate text-[12px]",
                      unread > 0
                        ? "text-slate-200"
                        : "text-slate-400 group-hover:text-slate-300",
                    ].join(" ")}
                  >
                    {lastPreview}
                  </span>

                  {last && (
                    <span className="flex-shrink-0 text-[11px] text-slate-500">
                      {last.author.username ?? "Inconnu"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
