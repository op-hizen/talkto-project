// app/chat/[roomId]/_hooks/useTypingPresence.ts
"use client";

import { useEffect, useRef, useState } from "react";

export type TypingSource = "assistant" | "user" | "other";

export type TypingPresencePayload = {
  roomId: string;
  isTyping: boolean;
  userId?: string | null;
  username?: string | null;
  source?: TypingSource;
};

type TypingUser = {
  userId: string;
  username: string | null;
  source: TypingSource;
  lastUpdate: number;
};

type TypingState = TypingUser[];

const TYPING_EVENT = "talkto:typing" as const;
const TYPING_TIMEOUT = 3500;

/* ---------------- HOOK ---------------- */

export function useTypingPresence(roomId: string) {
  const [users, setUsers] = useState<TypingState>([]);
  const roomIdRef = useRef(roomId);

  // reset quand on change de room
  useEffect(() => {
    roomIdRef.current = roomId;
    setUsers([]);
  }, [roomId]);

  // écoute des events typing
  useEffect(() => {
    const handleEvent = (e: Event) => {
      if (!(e instanceof CustomEvent)) return;

      const detail = e.detail as TypingPresencePayload | undefined;
      if (!detail) return;
      if (detail.roomId !== roomIdRef.current) return;

      const { isTyping, userId, username, source } = detail;
      if (!userId) return; // ignore sans id

      const now = Date.now();

      setUsers((prev) => {
        // purge des entrées expirées
        const filtered = prev.filter(
          (u) => now - u.lastUpdate < TYPING_TIMEOUT
        );

        // user stop typing
        if (!isTyping) {
          return filtered.filter((u) => u.userId !== userId);
        }

        const idx = filtered.findIndex((u) => u.userId === userId);

        const entry: TypingUser = {
          userId,
          username: username ?? null,
          source: source ?? "other",
          lastUpdate: now,
        };

        // new user typing
        if (idx === -1) return [...filtered, entry];

        // update existing
        const copy = filtered.slice();
        copy[idx] = { ...copy[idx], ...entry };
        return copy;
      });
    };

    window.addEventListener(
      TYPING_EVENT,
      handleEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        TYPING_EVENT,
        handleEvent as EventListener
      );
    };
  }, []);

  // nettoyage périodique
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setUsers((prev) =>
        prev.filter((u) => now - u.lastUpdate < TYPING_TIMEOUT)
      );
    }, 1000);

    return () => window.clearInterval(id);
  }, []);

  return {
    users,
    isTyping: users.length > 0,
  };
}

/* ---------------- EMITTER ---------------- */

export function emitTypingPresence(payload: TypingPresencePayload) {
  if (typeof window === "undefined") return;

  const ev = new CustomEvent<TypingPresencePayload>(TYPING_EVENT, {
    detail: payload,
  });

  window.dispatchEvent(ev);
}
