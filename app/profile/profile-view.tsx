// app/profile/profile-view.tsx
"use client";

import { useState } from "react";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Erreur inconnue");
        setLoading(false);
        return;
      }

      setSuccess("Pseudo mis à jour avec succès.");
      setLoading(false);
    } catch (err) {
      setError("Erreur réseau");
      setLoading(false);
    }
  };

  const createdDate = new Date(user.createdAt).toLocaleString("fr-FR");

  const roleStyle = getRoleStyle(user.role);
  const accessStyle = getAccessStatusStyle(user.accessStatus);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-xl p-8 rounded-2xl border border-white/10 bg-white/5 space-y-6">
        <div className="flex items-center gap-4">
          <img
            src="/default-avatar.png"
            alt="Avatar"
            className="w-16 h-16 rounded-full border border-white/20 object-cover"
          />
          <div className="space-y-1">
            <p className="text-lg font-semibold">
              {user.username ?? "Pseudo non défini"}
            </p>
            <div className="flex gap-2 flex-wrap">
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${roleStyle}`}
              >
                Rôle : {user.role}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${accessStyle}`}
              >
                Statut : {user.accessStatus}
              </span>
            </div>
            <p className="text-xs text-white/60">
              Membre depuis le {createdDate}
            </p>
            <p className="text-xs text-white/60">Email : {user.email}</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4">
          <h2 className="text-sm font-semibold mb-2">Pseudo</h2>
          <p className="text-xs text-white/60 mb-3">
            Tu peux changer de pseudo, mais au maximum une fois toutes les 24
            heures.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/20 focus:outline-none focus:border-white/50"
              placeholder="Nouveau pseudo"
            />

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            {success && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">
                {success}
              </p>
            )}

            {cooldownMessage && !canChangeUsername && (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
                {cooldownMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !canChangeUsername}
              className="w-full py-2 px-4 rounded-lg border border-white/20 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Validation..." : "Mettre à jour mon pseudo"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function getRoleStyle(role: string) {
  switch (role) {
    case "ADMIN":
      return "bg-red-500/20 border border-red-500/40";
    case "DEV":
      return "bg-purple-500/20 border border-purple-500/40";
    case "MODERATOR":
      return "bg-blue-500/20 border border-blue-500/40";
    case "SUPPORT":
      return "bg-emerald-500/20 border border-emerald-500/40";
    default:
      return "bg-white/10 border border-white/30";
  }
}

function getAccessStatusStyle(status: string) {
  switch (status) {
    case "MEMBER":
      return "bg-emerald-500/20 border border-emerald-500/40";
    case "TRIAL":
      return "bg-amber-500/20 border border-amber-500/40";
    case "BANNED":
      return "bg-red-500/20 border border-red-500/40";
    default:
      return "bg-white/10 border border-white/30";
  }
}
