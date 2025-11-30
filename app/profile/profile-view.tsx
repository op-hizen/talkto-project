// app/profile/profile-view.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type ProfileUser = {
  username: string | null;
  role: string;
  accessStatus: string;
  createdAt: string;
  email: string;
};

export default function ProfileView({
  user,
  canChangeUsername,
  cooldownMessage,
}: {
  user: ProfileUser;
  canChangeUsername: boolean;
  cooldownMessage: string | null;
}) {
  const [username, setUsername] = useState(user.username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createdDate = useMemo(
    () =>
      new Date(user.createdAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [user.createdAt]
  );

  const roleBadge = getRoleBadge(user.role);
  const accessBadge = getAccessBadge(user.accessStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canChangeUsername || loading) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Erreur inconnue");
        return;
      }

      setSuccess("Pseudo mis à jour avec succès.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen text-white">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_10%_-10%,rgba(168,85,247,0.25),transparent_60%),radial-gradient(900px_circle_at_100%_10%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(800px_circle_at_50%_120%,rgba(16,185,129,0.18),transparent_55%)] bg-black" />

      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-12">
        <section className="w-full space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Header */}
          <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/15">
              <Image
                src="/default-avatar.png"
                alt="Avatar"
                fill
                className="object-cover"
                priority
              />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {user.username ?? "Pseudo non défini"}
                </h1>
                <Badge {...roleBadge}>Rôle : {user.role}</Badge>
                <Badge {...accessBadge}>Statut : {user.accessStatus}</Badge>
              </div>

              <div className="grid gap-1 text-sm text-white/70">
                <p>
                  <span className="text-white/50">Membre depuis :</span>{" "}
                  {createdDate}
                </p>
                <p className="truncate">
                  <span className="text-white/50">Email :</span> {user.email}
                </p>
              </div>
            </div>
          </header>

          {/* Username block */}
          <section className="rounded-2xl border border-white/10 bg-black/30 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Pseudo</h2>
              {!canChangeUsername && (
                <span className="text-xs text-white/60">
                  Cooldown actif
                </span>
              )}
            </div>

            <p className="mb-4 text-sm text-white/60">
              Tu peux changer de pseudo, mais au maximum une fois toutes les 24
              heures.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block space-y-2">
                <span className="text-xs font-medium text-white/70">
                  Nouveau pseudo
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex : NeoRunner"
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-sm outline-none transition
                             placeholder:text-white/30
                             focus:border-white/30 focus:ring-2 focus:ring-white/10"
                  maxLength={32}
                  autoComplete="off"
                />
              </label>

              {error && <Alert tone="error">{error}</Alert>}
              {success && <Alert tone="success">{success}</Alert>}
              {cooldownMessage && !canChangeUsername && (
                <Alert tone="warn">{cooldownMessage}</Alert>
              )}

              <button
                type="submit"
                disabled={loading || !canChangeUsername}
                className="group relative w-full overflow-hidden rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold tracking-wide transition
                           hover:bg-white/15 hover:border-white/25
                           disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="relative z-10">
                  {loading ? "Validation..." : "Mettre à jour mon pseudo"}
                </span>
                {/* subtle shine */}
                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100
                                 bg-[radial-gradient(250px_circle_at_50%_-20%,rgba(255,255,255,0.18),transparent_60%)]" />
              </button>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}

/* ---------- UI bits ---------- */

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function Alert({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "error" | "success" | "warn";
}) {
  const styles =
    tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-amber-500/30 bg-amber-500/10 text-amber-100";

  return (
    <p className={`rounded-xl border px-3.5 py-2.5 text-xs ${styles}`}>
      {children}
    </p>
  );
}

/* ---------- Badges styles ---------- */

function getRoleBadge(role: string) {
  switch (role) {
    case "ADMIN":
      return { className: "border-red-400/40 bg-red-500/15 text-red-100" };
    case "DEV":
      return {
        className: "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-100",
      };
    case "MODERATOR":
      return {
        className: "border-blue-400/40 bg-blue-500/15 text-blue-100",
      };
    case "SUPPORT":
      return {
        className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
      };
    default:
      return { className: "border-white/20 bg-white/10 text-white/90" };
  }
}

function getAccessBadge(status: string) {
  switch (status) {
    case "MEMBER":
      return {
        className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
      };
    case "TRIAL":
      return {
        className: "border-amber-400/40 bg-amber-500/15 text-amber-100",
      };
    case "BANNED":
      return { className: "border-red-400/40 bg-red-500/15 text-red-100" };
    default:
      return { className: "border-white/20 bg-white/10 text-white/90" };
  }
}
