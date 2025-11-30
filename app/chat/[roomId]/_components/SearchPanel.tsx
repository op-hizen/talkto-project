// app/chat/[roomId]/_components/SearchPanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Result = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; username: string | null };
};

export default function SearchPanel({
  roomId,
  onPick,
}: {
  roomId: string;
  onPick: (messageId: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canSearch = q.trim().length >= 2;

  // close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !rootRef.current) return;
      if (rootRef.current.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ESC close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // fetch search
  useEffect(() => {
    if (!canSearch) {
      setResults([]);
      setCursor(null);
      setOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/chat/search?roomId=${roomId}&q=${encodeURIComponent(q.trim())}`
        );
        const json = await res.json();
        setResults(json.results ?? []);
        setCursor(json.nextCursor ?? null);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(t);
  }, [q, roomId, canSearch]);

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/chat/search?roomId=${roomId}&q=${encodeURIComponent(
          q.trim()
        )}&cursor=${encodeURIComponent(cursor)}`
      );
      const json = await res.json();
      setResults((r) => [...r, ...(json.results ?? [])]);
      setCursor(json.nextCursor ?? null);
    } finally {
      setLoading(false);
    }
  };

  const preview = (s: string) =>
    s.length > 120 ? s.slice(0, 117) + "…" : s;

  const countLabel = useMemo(() => {
    if (loading) return "Recherche…";
    if (!results.length) return "Aucun résultat";
    return `${results.length} résultat${results.length > 1 ? "s" : ""}`;
  }, [loading, results.length]);

  return (
    <div ref={rootRef} className="relative z-50">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => canSearch && setOpen(true)}
        placeholder="Rechercher dans ce salon…"
        className="
          w-72 max-w-[70vw]
          rounded-xl bg-white/[0.04] border border-white/10
          px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500
          outline-none focus:ring-2 focus:ring-indigo-500/40
        "
      />

      <AnimatePresence>
        {open && canSearch && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.16 }}
            className="
              absolute right-0 mt-2 w-[28rem] max-w-[90vw]
              rounded-2xl border border-white/10 bg-black/95 backdrop-blur-2xl
              shadow-[0_18px_90px_rgba(0,0,0,0.95)]
              overflow-hidden z-[9999]
            "
          >
            <div className="px-3 py-2 text-[11px] text-slate-400 border-b border-white/10 flex items-center justify-between">
              <span>{countLabel}</span>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-200 transition"
              >
                Fermer
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto scrollbar-talkto">
              {!results.length && !loading && (
                <div className="px-4 py-6 text-sm text-slate-500">
                  Aucun résultat.
                </div>
              )}

              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    onPick(r.id);
                    setOpen(false);
                  }}
                  className="
                    w-full text-left px-4 py-3 border-b border-white/5
                    hover:bg-white/[0.045] transition
                  "
                >
                  <div className="text-[12px] text-slate-200">
                    {preview(r.content)}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500 flex justify-between">
                    <span>{r.author.username ?? "Utilisateur"}</span>
                    <span>
                      {new Date(r.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </button>
              ))}

              {cursor && (
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="
                    w-full px-4 py-2 text-[12px] text-indigo-200
                    hover:bg-white/[0.04] disabled:opacity-60 transition
                  "
                >
                  {loading ? "Chargement…" : "Charger plus"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
