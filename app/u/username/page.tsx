// app/u/username/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function UsernamePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  

  // Si pas connecté -> redirection login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Si déjà un pseudo -> redirection dashboard
  useEffect(() => {
    if (status === "authenticated" && session?.user?.username) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur inconnue");
        setLoading(false);
        return;
      }

      // Succès -> dashboard
      router.replace("/dashboard");
    } catch (err) {
      setError("Erreur réseau");
      setLoading(false);
    }
  };

  // Pendant qu'on ne sait pas si l'utilisateur est connecté
  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 rounded-2xl border border-white/10 bg-white/5">
        <h1 className="text-2xl font-semibold mb-2 text-center">
          Choisis ton pseudo
        </h1>
        <p className="text-sm text-white/70 mb-6 text-center">
          Obligatoire pour utiliser TalkTo.  
          3 à 24 caractères, lettres, chiffres et "_" uniquement.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm text-white/80">
              Pseudo
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/20 focus:outline-none focus:border-white/50"
              placeholder="ex: talkto_user"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-lg border border-white/20 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Validation..." : "Valider mon pseudo"}
          </button>
        </form>
      </div>
    </main>
  );
}
