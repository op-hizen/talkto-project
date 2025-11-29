// app/ui/admin/admin-user-actions.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

const roleChoices = ["ADMIN", "DEV", "MODERATOR", "SUPPORT", "USER"] as const;
type RoleChoice = (typeof roleChoices)[number];

export default function AdminUserActions({
  userId,
  isBanned,
  currentRole,
  showDetails = true,
  compact = false,
}: {
  userId: string;
  isBanned: boolean;
  currentRole: string;
  showDetails?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState<null | "ban" | "unban" | "role">(null);
  const [nextRole, setNextRole] = useState<RoleChoice>(
    (currentRole as RoleChoice) ?? "USER"
  );

  const go = (href: string) => {
    window.location.href = href;
  };

  const btnBase =
    "rounded-2xl border px-3 py-1.5 text-[11px] font-semibold transition";
  const btnCompact = compact ? "px-2.5 py-1 rounded-full" : "";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showDetails && (
          <Link
            href={`/ui/admin/user/${userId}`}
            className={`${btnBase} ${btnCompact} border-white/15 bg-black/50 text-white/80 hover:border-white/40 hover:bg-white/[0.06]`}
          >
            Détails
          </Link>
        )}

        {isBanned ? (
          <button
            onClick={() => setOpen("unban")}
            className={`${btnBase} ${btnCompact} border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-500/20`}
          >
            Déban
          </button>
        ) : (
          <button
            onClick={() => setOpen("ban")}
            className={`${btnBase} ${btnCompact} border-red-400/30 bg-red-500/10 text-red-200 hover:border-red-400/60 hover:bg-red-500/20`}
          >
            Ban
          </button>
        )}

        <button
          onClick={() => setOpen("role")}
          className={`${btnBase} ${btnCompact} border-white/15 bg-white/[0.04] text-white/70 hover:border-white/40 hover:bg-white/[0.08]`}
        >
          Rôle
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/90 p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {open === "ban" && "Bannir l’utilisateur"}
                  {open === "unban" && "Débannir l’utilisateur"}
                  {open === "role" && "Changer le rôle"}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  ID : <span className="font-mono">{userId}</span>
                </p>
              </div>

              <button
                onClick={() => setOpen(null)}
                className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70 hover:border-white/30"
              >
                ✕
              </button>
            </div>

            {open === "role" ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {roleChoices.map((r) => (
                    <button
                      key={r}
                      onClick={() => setNextRole(r)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        nextRole === r
                          ? "border-white bg-white text-black"
                          : "border-white/15 bg-white/[0.03] text-white/80 hover:border-white/40 hover:bg-white/[0.06]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setOpen(null)}
                    className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-white/80 hover:border-white/40"
                  >
                    Annuler
                  </button>

                  {/* Branche ici ta route changement de rôle */}
                  <button
                    onClick={() =>
                      go(`/ui/admin/user/${userId}/role?next=${nextRole}`)
                    }
                    className="rounded-xl border border-white/15 bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-white/70">
                  {open === "ban"
                    ? "L’utilisateur perdra l’accès. Tu pourras le débannir plus tard."
                    : "L’accès sera rétabli avec son rôle actuel."}
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setOpen(null)}
                    className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-white/80 hover:border-white/40"
                  >
                    Annuler
                  </button>

                  <button
                    onClick={() =>
                      go(
                        open === "ban"
                          ? `/ui/admin/user/${userId}/ban`
                          : `/ui/admin/user/${userId}/unban`
                      )
                    }
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      open === "ban"
                        ? "border-red-400/40 bg-red-500/15 text-red-200 hover:bg-red-500/25"
                        : "border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                    }`}
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
