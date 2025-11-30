// app/ui/admin/chat/logs/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const runtime = "nodejs";

type SearchParams = {
  type?: "EDIT" | "DELETE" | "ALL";
  q?: string;
  room?: string;
};

const ADMIN_ROLES = ["ADMIN", "DEV", "MODERATOR", "SUPPORT"];

export default async function ChatLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!me || !ADMIN_ROLES.includes(me.role)) {
    redirect("/");
  }

  const typeFilter = params.type && params.type !== "ALL" ? params.type : null;
  const q = params.q?.trim() ?? "";
  const roomFilter = params.room?.trim() ?? "";

  const histories = await prisma.chatMessageHistory.findMany({
    where: {
      ...(typeFilter && { type: typeFilter }),
      ...(roomFilter && {
        message: {
          room: {
            OR: [{ slug: roomFilter }, { id: roomFilter }],
          },
        },
      }),
      ...(q && {
        OR: [
          { previousContent: { contains: q, mode: "insensitive" } },
          {
            editedBy: {
              username: { contains: q, mode: "insensitive" },
            },
          },
          {
            message: {
              author: {
                username: { contains: q, mode: "insensitive" },
              },
            },
          },
          {
            message: {
              room: {
                name: { contains: q, mode: "insensitive" },
              },
            },
          },
          {
            message: {
              room: {
                slug: { contains: q, mode: "insensitive" },
              },
            },
          },
        ],
      }),
    },
    include: {
      editedBy: true,
      message: {
        include: {
          author: true,
          room: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] to-black text-neutral-100">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Logs du chat</h1>
            <p className="text-xs text-neutral-400">
              Historique des éditions et suppressions, avec avant / après.
            </p>
          </div>

          <form className="flex flex-wrap items-center gap-2 text-xs bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Rechercher (contenu, user, salon...)"
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-neutral-400 min-w-[180px]"
            />
            <input
              type="text"
              name="room"
              defaultValue={roomFilter}
              placeholder="room slug/id (ex: general)"
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-neutral-400 w-40"
            />
            <select
              name="type"
              defaultValue={typeFilter ?? "ALL"}
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-neutral-400"
            >
              <option value="ALL">Tous</option>
              <option value="EDIT">Éditions</option>
              <option value="DELETE">Suppressions</option>
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-900 font-medium"
            >
              Filtrer
            </button>
          </form>
        </div>

        {/* Résumé */}
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <span className="px-2 py-1 rounded-full bg-neutral-900 border border-neutral-800">
            {histories.length} log(s)
          </span>
          {roomFilter && (
            <span className="text-[11px]">
              Salon filtré:{" "}
              <code className="bg-neutral-900 px-1.5 py-0.5 rounded-md border border-neutral-800 text-[10px]">
                {roomFilter}
              </code>
            </span>
          )}
        </div>

        {/* Liste */}
        {histories.length === 0 ? (
          <div className="text-sm text-neutral-500 border border-dashed border-neutral-700 rounded-xl px-4 py-10 text-center">
            Aucun log pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {histories.map((h) => {
              const room = h.message.room;
              const roomSlug = room.slug ?? room.id;
              const author = h.message.author;
              const editor = h.editedBy;

              const createdAt = new Date(h.createdAt).toLocaleString("fr-FR", {
                year: "2-digit",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });

              const afterContent =
                h.type === "DELETE"
                  ? "Message supprimé"
                  : h.message.content;

              const typeColor =
                h.type === "EDIT"
                  ? "border-yellow-400/70 text-yellow-300 bg-yellow-500/5"
                  : "border-red-400/70 text-red-300 bg-red-500/5";

              return (
                <div
                  key={h.id}
                  className="border border-neutral-800 bg-neutral-950/70 rounded-xl p-3 text-xs flex gap-3"
                >
                  {/* Colonne timeline */}
                  <div className="flex flex-col items-center pt-1">
                    <div
                      className={`px-2 py-0.5 rounded-full border text-[10px] ${typeColor}`}
                    >
                      {h.type === "EDIT" ? "EDIT" : "DELETE"}
                    </div>
                    <div className="flex-1 w-px bg-neutral-800 mt-2" />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 space-y-2">
                    {/* Top row: meta */}
                    <div className="flex flex-wrap justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-[11px] text-neutral-300">
                          <span className="font-medium">
                            {author.username ?? "Utilisateur"}
                          </span>
                          <code className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                            {author.id}
                          </code>
                          <span className="text-neutral-500 text-[10px]">
                            →{" "}
                            <Link
                              href={`/chat/${roomSlug}`}
                              className="underline underline-offset-2"
                            >
                              #{room.name ?? room.slug ?? room.id.slice(0, 6)}
                            </Link>
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {createdAt}
                          {h.message.createdAt && (
                            <>
                              {" "}
                              · msg{" "}
                              {new Date(
                                h.message.createdAt
                              ).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="text-[11px] text-neutral-400">
                          {editor ? (
                            <>
                              Modifié par{" "}
                              <span className="font-medium">
                                {editor.username ?? editor.email ?? "—"}
                              </span>
                            </>
                          ) : (
                            <span className="text-neutral-500">
                              Modifié par : —
                            </span>
                          )}
                        </div>
                        {editor && (
                          <code className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                            {editor.id}
                          </code>
                        )}
                      </div>
                    </div>

                    {/* Avant / Après */}
                    <div className="grid md:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span>Avant</span>
                          <span className="text-[9px] uppercase tracking-wide text-neutral-500">
                            ancienne version
                          </span>
                        </div>
                        <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-[11px] font-mono whitespace-pre-wrap text-neutral-200 max-h-40 overflow-y-auto">
                          {h.previousContent || <span className="opacity-50">—</span>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span>Après</span>
                          <span className="text-[9px] uppercase tracking-wide text-neutral-500">
                            contenu actuel
                          </span>
                        </div>
                        <div
                          className={`border rounded-lg p-2 text-[11px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto ${
                            h.type === "DELETE"
                              ? "bg-red-950/30 border-red-800/60 text-red-200"
                              : "bg-neutral-950 border-neutral-800 text-neutral-200"
                          }`}
                        >
                          {afterContent || (
                            <span className="opacity-50">—</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer: liens rapides */}
                    <div className="flex justify-between items-center text-[10px] text-neutral-500 pt-1">
                      <div className="flex gap-2">
                        <Link
                          href={`/chat/${roomSlug}`}
                          className="hover:text-neutral-300 underline underline-offset-2"
                        >
                          Voir le salon
                        </Link>
                      </div>
                      <div className="text-neutral-600">
                        Log ID:{" "}
                        <code className="bg-neutral-950 px-1 py-0.5 rounded border border-neutral-900">
                          {h.id}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
