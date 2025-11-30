// app/chat/[roomId]/_components/RoomSidebar.tsx
import Image from "next/image";

type SidebarParticipant = {
  id: string;
  username: string;
  image: string | null;
  role: string;
};

type Props = {
  roomName: string;
  roomSlug: string;
  participants: SidebarParticipant[];
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-purple-300 bg-purple-500/10 border-purple-500/40",
  DEV: "text-purple-300 bg-purple-500/10 border-purple-500/40",
  MODERATOR: "text-blue-300 bg-blue-500/10 border-blue-500/40",
  SUPPORT: "text-blue-300 bg-blue-500/10 border-blue-500/40",
  USER: "text-neutral-300 bg-neutral-800/80 border-neutral-700",
};

export function RoomSidebar({ roomName, roomSlug, participants }: Props) {
  return (
    <aside className="hidden md:flex flex-col w-60 border border-neutral-800 bg-black/60 rounded-2xl px-3 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(0,0,0,0.6)]">
      <div className="mb-3 pb-3 border-b border-neutral-800">
        <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
          Salon
        </div>
        <div className="text-sm font-semibold text-neutral-100 truncate">
          {roomName}
        </div>
        <div className="text-[11px] text-neutral-500 truncate">
          /chat/{roomSlug}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between text-[11px] text-neutral-500">
        <span>Participants</span>
        <span className="px-1.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400">
          {participants.length}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 text-xs">
        {participants.map((p) => {
          const roleKey = p.role ?? "USER";
          const roleClass =
            ROLE_COLORS[roleKey] ?? ROLE_COLORS["USER"];

          return (
            <div
              key={p.id}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-neutral-900/60 transition"
            >
              <div className="h-7 w-7 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.username}
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[11px] text-neutral-300">
                    {p.username[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-[11px] text-neutral-100">
                  {p.username}
                </div>
                <div
                  className={`inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-full border text-[9px] uppercase tracking-wide ${roleClass}`}
                >
                  {roleKey}
                </div>
              </div>
            </div>
          );
        })}

        {participants.length === 0 && (
          <div className="text-[11px] text-neutral-500 italic px-2 py-2">
            Personne pour le moment.
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-800 text-[10px] text-neutral-500 space-y-1">
        <div className="flex items-center justify-between">
          <span className="uppercase tracking-wide text-[9px] text-neutral-600">
            Raccourcis
          </span>
        </div>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span className="w-10 text-neutral-600">Entrée</span>
            <span className="text-neutral-300">Envoyer</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-10 text-neutral-600">Shift+Entrée</span>
            <span className="text-neutral-300">Retour à la ligne</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-10 text-neutral-600">@</span>
            <span className="text-neutral-300">Mentionner un utilisateur</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-10 text-neutral-600">Échap</span>
            <span className="text-neutral-300">
              Annuler édition / réponse / mentions
            </span>
          </li>
        </ul>
      </div>
    </aside>
  );
}
