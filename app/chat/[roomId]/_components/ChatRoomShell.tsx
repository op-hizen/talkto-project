// app/chat/[roomId]/_components/ChatRoomShell.tsx
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import ChatRoomClient from "../ChatRoomClient";
import type { Message, ChatRoomHandle } from "../chatTypes";
import { TypingIndicator } from "./TypingIndicator";
import { useTypingPresence } from "../_hooks/useTypingPresence";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import SearchPanel from "./SearchPanel";

type Participant = {
  id: string;
  username: string | null;
  image: string | null;
  role: string | null;
  createdAt: string; // ISO
};

type ChatRoomShellProps = {
  roomId: string;
  roomSlug: string;
  roomDisplayName: string;
  currentUserId: string;
  currentUsername: string;
  initialMessages: Message[];
  participantsCount: number;
  participants: Participant[];
};

const STAFF_ROLES = ["ADMIN", "DEV", "MODERATOR", "SUPPORT"] as const;

/* ---------------- MOTION VARIANTS ---------------- */

const shellVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.992 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
} satisfies Variants;

const headerVariants = {
  hidden: { opacity: 0, y: -6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.04, duration: 0.35 },
  },
} satisfies Variants;

const cardVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22 },
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.985,
    transition: { duration: 0.16 },
  },
} satisfies Variants;

/* ---------------- MAIN ---------------- */

export function ChatRoomShell({
  roomId,
  roomSlug,
  roomDisplayName,
  currentUserId,
  currentUsername,
  initialMessages,
  participantsCount,
  participants,
}: ChatRoomShellProps) {
  const { users, isTyping } = useTypingPresence(roomId);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const chatRef = useRef<ChatRoomHandle | null>(null);

  const userMap = useMemo(
    () => new Map(participants.map((u) => [u.id, u])),
    [participants]
  );

  const selectedUser = selectedUserId
    ? userMap.get(selectedUserId) ?? null
    : null;

  const assistantUsers = users.filter((u) => u.source === "assistant");
  const humanUsers = users.filter((u) => u.source !== "assistant");

  const typingText = useMemo(() => {
    if (assistantUsers.length === 1 && humanUsers.length === 0) {
      return "L’assistant rédige…";
    }

    const names = humanUsers
      .map((u) => u.username || "Utilisateur")
      .filter((name, idx, arr) => arr.indexOf(name) === idx)
      .slice(0, 2);

    if (names.length === 0) return "Quelqu’un est en train d’écrire...";
    if (names.length === 1) return `${names[0]} est en train d’écrire...`;
    return `${names[0]} et ${names[1]} sont en train d’écrire...`;
  }, [assistantUsers.length, humanUsers]);

  const formatDate = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    []
  );

  const renderFloatingCard = useCallback(() => {
    if (!selectedUser) return null;

    const isStaff =
      !!selectedUser.role &&
      STAFF_ROLES.includes(selectedUser.role as (typeof STAFF_ROLES)[number]);

    return (
      <AnimatePresence>
        {/* Desktop card */}
        <motion.div
          key="profile-desktop"
          variants={cardVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="
            hidden lg:block absolute top-24 left-0 -translate-x-full
            w-64 rounded-2xl border border-white/10 bg-black/65
            shadow-[0_22px_80px_rgba(0,0,0,0.75)] backdrop-blur-2xl
            overflow-hidden z-40
          "
        >
          <div className="relative flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[11px] text-slate-400 uppercase tracking-[0.16em]">
              Profil
            </span>
            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="text-[11px] text-slate-500 hover:text-slate-200 transition"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="px-3 py-3 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center overflow-hidden">
                {selectedUser.image ? (
                  <Image
                    src={selectedUser.image}
                    alt={selectedUser.username ?? "avatar"}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm text-slate-200">
                    {(selectedUser.username ?? "?")[0]?.toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-100">
                  {selectedUser.username ?? "Utilisateur"}
                </span>

                {isStaff && (
                  <span className="mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full border border-indigo-400/60 bg-indigo-500/10 text-indigo-200 uppercase tracking-wide inline-flex w-fit">
                    {selectedUser.role}
                  </span>
                )}
              </div>
            </div>

            <div className="h-px bg-white/10" />

            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Création du compte</span>
                <span>{formatDate(selectedUser.createdAt)}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mobile card */}
        <motion.div
          key="profile-mobile"
          variants={cardVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="
            lg:hidden fixed left-1/2 bottom-4 z-50 w-[90%] max-w-sm
            -translate-x-1/2 rounded-2xl border border-white/10
            bg-black/75 shadow-[0_22px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl
          "
        >
          <div className="relative flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[11px] text-slate-400 uppercase tracking-[0.16em]">
              Profil
            </span>
            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="text-[11px] text-slate-500 hover:text-slate-200 transition"
            >
              Fermer
            </button>
          </div>

          <div className="px-3 py-3 flex flex-row gap-3 items-center">
            <div className="h-10 w-10 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center overflow-hidden">
              {selectedUser.image ? (
                <Image
                  src={selectedUser.image}
                  alt={selectedUser.username ?? "avatar"}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-200">
                  {(selectedUser.username ?? "?")[0]?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex flex-col flex-1">
              <span className="text-sm font-semibold text-slate-100">
                {selectedUser.username ?? "Utilisateur"}
              </span>
              <span className="text-[10px] text-slate-400">
                Compte créé le {formatDate(selectedUser.createdAt)}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }, [selectedUser, formatDate]);

  return (
    <div className="h-[calc(100vh-56px)] min-h-[calc(100vh-56px)] bg-[radial-gradient(circle_at_top,_#0b1220,_#05070d_55%,_#000_100%)] flex items-stretch justify-center px-4 py-6">
      <motion.div
        variants={shellVariants}
        initial="hidden"
        animate="show"
        className="
          relative w-full max-w-5xl h-full min-h-0
          rounded-3xl border border-white/10 bg-black/55
          shadow-[0_28px_110px_rgba(0,0,0,0.9)] backdrop-blur-2xl
          flex flex-col
        "
      >
        {renderFloatingCard()}

        {/* HEADER */}
        <motion.header
          variants={headerVariants}
          initial="hidden"
          animate="show"
          className="
            relative z-30 px-5 py-4 border-b border-white/10
            rounded-t-3xl flex-shrink-0
          "
        >
          <div className="relative flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                TalkTo · Salon
              </div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-lg font-semibold text-slate-50">
                  {roomDisplayName}
                </span>
                <span className="text-[11px] text-slate-500">
                  /chat/{roomSlug}
                </span>
              </div>
            </div>

            {/* SEARCH */}
            <SearchPanel
              roomId={roomId}
              onPick={async (messageId) => {
                const api = chatRef.current;
                if (!api) return;

                if (api.hasMessage(messageId)) {
                  api.jumpToMessage(messageId);
                  return;
                }

                const res = await fetch(
                  `/api/chat/jump?roomId=${roomId}&messageId=${messageId}`
                );
                if (!res.ok) return;
                const json = await res.json();

                if (json?.messages?.length) {
                  api.mergeMessages(json.messages);
                  requestAnimationFrame(() => api.jumpToMessage(messageId));
                }
              }}
            />

            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                <span>
                  {participantsCount} connecté·e
                  {participantsCount > 1 ? "s" : ""}
                </span>
              </span>
            </div>
          </div>
        </motion.header>

        {/* CHAT */}
        <main className="flex-1 min-h-0 p-3 flex flex-col gap-2 overflow-hidden rounded-b-3xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.06, duration: 0.3 }}
            className="
              flex-1 min-h-0 rounded-2xl border border-white/10
              bg-gradient-to-b from-black/40 via-black/70 to-black/50
              overflow-hidden
              flex flex-col
            "
          >
            {/* Chat client */}
            <div className="flex-1 min-h-0">
              <ChatRoomClient
                ref={chatRef}
                roomId={roomId}
                roomSlug={roomSlug}
                roomName={roomDisplayName}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                initialMessages={initialMessages}
                onUserClick={setSelectedUserId}
              />
            </div>

            {/* TypingIndicator DANS le shell, hors client */}
            <div className="flex justify-end items-center px-3 py-1.5 border-t border-white/5 bg-black/30">
              <AnimatePresence mode="wait">
                {isTyping && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <TypingIndicator visible text={typingText} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Hint clavier */}
          <div className="flex justify-between items-center px-1 flex-shrink-0">
            <div className="text-[11px] text-slate-500">
              Entrée pour envoyer · Shift+Entrée pour une nouvelle ligne
            </div>
          </div>
        </main>
      </motion.div>
    </div>
  );
}

export default ChatRoomShell;
