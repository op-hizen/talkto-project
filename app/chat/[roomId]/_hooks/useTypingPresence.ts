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

const TYPING_EVENT = "talkto:typing";
const TYPING_TIMEOUT = 3500;

export function useTypingPresence(roomId: string) {
  const [users, setUsers] = useState<TypingState>([]);
  const roomIdRef = useRef(roomId);

  useEffect(() => {
    roomIdRef.current = roomId;
    setUsers([]);
  }, [roomId]);

  // écoute des events
  useEffect(() => {
    function handleEvent(e: Event) {
      if (!(e instanceof CustomEvent)) return;

      const detail = e.detail as TypingPresencePayload | undefined;
      if (!detail) return;
      if (detail.roomId !== roomIdRef.current) return;

      const { isTyping, userId, username, source } = detail;
      if (!userId) return; // on ignore les events sans id

      const now = Date.now();

      setUsers((prev) => {
        // on enlève tout ce qui est expiré
        const filtered = prev.filter(
          (u) => now - u.lastUpdate < TYPING_TIMEOUT
        );

        if (!isTyping) {
          // cet utilisateur arrête d’écrire
          return filtered.filter((u) => u.userId !== userId);
        }

        const idx = filtered.findIndex((u) => u.userId === userId);
        const entry: TypingUser = {
          userId,
          username: username ?? null,
          source: source ?? "other",
          lastUpdate: now,
        };

        if (idx === -1) {
          return [...filtered, entry];
        }

        const copy = [...filtered];
        copy[idx] = { ...copy[idx], ...entry };
        return copy;
      });
    }

    window.addEventListener(TYPING_EVENT, handleEvent as EventListener);
    return () => {
      window.removeEventListener(TYPING_EVENT, handleEvent as EventListener);
    };
  }, []);

  // nettoyage périodique (au cas où aucun event ne tombe)
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setUsers((prev) =>
        prev.filter((u) => now - u.lastUpdate < TYPING_TIMEOUT)
      );
    }, 1000);

    return () => clearInterval(id);
  }, []);

  return {
    users,
    isTyping: users.length > 0,
  };
}

export function emitTypingPresence(payload: TypingPresencePayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<TypING_EVENT>(TYPING_EVENT as any, {
      detail: payload,
    }) as any
  );
}
