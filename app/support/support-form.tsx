// app/support/support-form.tsx
"use client";

import { useState } from "react";

export default function SupportForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Erreur inconnue.");
        setLoading(false);
        return;
      }

      setSuccess("Ton message a bien été envoyé au support.");
      setSubject("");
      setMessage("");
      setLoading(false);
    } catch (err) {
      setError("Erreur réseau.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Sujet</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/20 focus:outline-none focus:border-white/50 text-sm"
          placeholder="Ex: Contestation de ban, problème de paiement..."
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/20 focus:outline-none focus:border-white/50 text-sm min-h-[120px]"
          placeholder="Décris ton problème le plus précisément possible..."
        />
      </div>

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

      <button
        type="submit"
        disabled={loading || !subject || !message}
        className="w-full py-2 px-4 rounded-lg border border-white/20 hover:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
      >
        {loading ? "Envoi..." : "Envoyer au support"}
      </button>
    </form>
  );
}
