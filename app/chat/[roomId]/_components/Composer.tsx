// app/chat/[roomId]/_components/Composer.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

import type { MentionUser, Message } from "../chatTypes";

/* ---------------- CONSTS ---------------- */

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const MAX_MENTION_SUGGESTIONS = 10;
const MAX_LEN = 2000;

const replyBarVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: 6, transition: { duration: 0.15 } },
};

const mentionBoxVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 6, scale: 0.985, transition: { duration: 0.12 } },
};

function containsEmoji(str: string) {
  return EMOJI_REGEX.test(str);
}

type Props = {
  roomId: string;
  currentUserId: string;
  currentUsername: string;
  effectiveUsername: string;

  getMentionUsers: () => MentionUser[];

  isSafeDebate: boolean;
  cooldownMs: number;

  notifyTyping: () => void;
  stopTyping: () => void;

  onSendOrEdit: (
    text: string,
    editingMessageId: string | null,
    replyTo?: Message | null
  ) => Promise<void>;

  // actions venant de la liste
  editingTarget: Message | null;
  replyTarget: Message | null;
  onClearTargets: () => void;
};

export default function Composer({
  roomId,
  currentUserId,
  currentUsername,
  effectiveUsername,
  getMentionUsers,
  isSafeDebate,
  cooldownMs,
  notifyTyping,
  stopTyping,
  onSendOrEdit,
  editingTarget,
  replyTarget,
  onClearTargets,
}: Props) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);

  const editingMessageId = editingTarget?.id ?? null;
  const replyToTarget = replyTarget;

  /* ---------- SYNC INPUT WHEN EDITING ---------- */

  useEffect(() => {
    if (editingTarget) {
      setInput(editingTarget.content);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [editingTarget]);

  /* ---------- AUTO-RESIZE TEXTAREA ---------- */

  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 112) + "px";
  }, [input]);

  /* ---------- COOLDOWN LIVE ---------- */

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(null);
      return;
    }

    const tick = () => {
      const diff = cooldownUntil - Date.now();
      if (diff <= 0) {
        setCooldownUntil(null);
        setCooldownRemaining(null);
      } else {
        setCooldownRemaining(Math.ceil(diff / 1000));
      }
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  /* ---------- MENTIONS ---------- */

  const mentionUsers = useMemo(() => getMentionUsers(), [getMentionUsers, roomId]);
  const filteredMentionUsers = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase().trim();
    if (!q) return mentionUsers.slice(0, MAX_MENTION_SUGGESTIONS);
    return mentionUsers
      .filter((u) => u.username.toLowerCase().includes(q))
      .slice(0, MAX_MENTION_SUGGESTIONS);
  }, [mentionQuery, mentionUsers]);

  useEffect(() => {
    if (mentionIndex >= filteredMentionUsers.length) setMentionIndex(0);
  }, [filteredMentionUsers.length, mentionIndex]);

  const insertMention = useCallback(
    (username: string) => {
      if (!username) return;
      const textarea = textareaRef.current;
      const value = input;
      const cursorPos =
        textarea && typeof textarea.selectionStart === "number"
          ? textarea.selectionStart
          : value.length;

      const before = value.slice(0, cursorPos);
      const after = value.slice(cursorPos);

      const match = /(^|\s)@([\w-]*)$/.exec(before);
      if (!match) return;

      const replaceStart = match.index + match[1].length;
      const newBefore = before.slice(0, replaceStart) + "@" + username + " ";
      const newValue = newBefore + after;

      setInput(newValue);
      setMentionQuery(null);
      setMentionIndex(0);

      const newCursorPos = newBefore.length;
      if (textarea) {
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        });
      }
    },
    [input]
  );

  /* ---------- INPUT CHANGE ---------- */

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value.slice(0, MAX_LEN);
      setInput(value);
      setErrorMessage(null);

      if (value.trim().length > 0) notifyTyping();
      else stopTyping();

      const cursorPos = e.target.selectionStart ?? value.length;
      const before = value.slice(0, cursorPos);

      const match = /(^|\s)@([\w-]*)$/.exec(before);
      if (match) {
        setMentionQuery(match[2] ?? "");
        setMentionIndex(0);
      } else {
        setMentionQuery(null);
        setMentionIndex(0);
      }
    },
    [notifyTyping, stopTyping]
  );

  /* ---------- SEND / EDIT ---------- */

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (isSafeDebate) {
      if (containsEmoji(trimmed)) {
        setErrorMessage("Les emojis sont interdits dans ce salon.");
        return;
      }
      const now = Date.now();
      if (cooldownUntil && now < cooldownUntil) {
        const remaining = Math.ceil((cooldownUntil - now) / 1000);
        setErrorMessage(
          `Tu dois attendre encore ${remaining}s avant d’envoyer un nouveau message ici.`
        );
        return;
      }
    }

    setInput("");
    setMentionQuery(null);
    setMentionIndex(0);
    stopTyping();

    try {
      await onSendOrEdit(trimmed, editingMessageId, replyToTarget);

      if (isSafeDebate) {
        setCooldownUntil(Date.now() + cooldownMs);
      }

      onClearTargets();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : "Impossible d’envoyer le message."
      );
    }
  }, [
    input,
    isSafeDebate,
    cooldownUntil,
    editingMessageId,
    replyToTarget,
    stopTyping,
    onSendOrEdit,
    cooldownMs,
    onClearTargets,
  ]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await send();
    },
    [send]
  );

  /* ---------- TEXTAREA KEYDOWN ---------- */

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        if (mentionQuery !== null) {
          setMentionQuery(null);
          setMentionIndex(0);
          return;
        }
        onClearTargets();
        return;
      }

      if (mentionQuery !== null && filteredMentionUsers.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((idx) => (idx + 1) % filteredMentionUsers.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex(
            (idx) =>
              (idx - 1 + filteredMentionUsers.length) %
              filteredMentionUsers.length
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          const user = filteredMentionUsers[mentionIndex];
          if (user) insertMention(user.username);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [mentionQuery, filteredMentionUsers, mentionIndex, insertMention, send, onClearTargets]
  );

  const canSend =
    !!input.trim() &&
    !(isSafeDebate && cooldownRemaining !== null && cooldownRemaining > 0);

  return (
    <div className="border-t border-white/10 px-4 py-2 space-y-1 bg-black/70 backdrop-blur-xl">
      {/* Reply bar */}
      <AnimatePresence>
        {replyToTarget && (
          <motion.div
            variants={replyBarVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex items-center justify-between text-[11px] text-slate-300 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2"
          >
            <div className="truncate">
              <span className="opacity-70">Répondre à </span>
              <span className="font-semibold">
                {replyToTarget.author.username ?? "Utilisateur"}
              </span>
              <span className="opacity-60"> — </span>
              <span className="text-slate-200">
                {replyToTarget.content.length > 80
                  ? replyToTarget.content.slice(0, 77) + "…"
                  : replyToTarget.content}
              </span>
            </div>
            <button
              type="button"
              onClick={onClearTargets}
              className="ml-3 text-[10px] text-slate-500 hover:text-slate-200 transition"
            >
              Annuler
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mentions box */}
      <AnimatePresence>
        {mentionQuery !== null && filteredMentionUsers.length > 0 && (
          <motion.div
            variants={mentionBoxVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="bg-black/80 border border-white/10 rounded-xl mb-1 max-h-40 overflow-y-auto text-xs shadow-lg backdrop-blur-xl scrollbar-talkto"
          >
            {filteredMentionUsers.map((u, idx) => (
              <button
                key={u.id}
                type="button"
                onClick={() => insertMention(u.username)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition ${
                  idx === mentionIndex
                    ? "bg-white/[0.06]"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <span className="text-slate-100">@{u.username}</span>
                {u.id === currentUserId && (
                  <span className="text-[10px] text-slate-500">toi</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {errorMessage && (
        <div className="text-[11px] text-red-300 mb-1">{errorMessage}</div>
      )}

      {isSafeDebate && cooldownRemaining !== null && (
        <div className="text-[11px] text-amber-300 mb-1">
          Tu pourras envoyer un nouveau message ici dans{" "}
          <span className="font-semibold">{cooldownRemaining}s</span>.
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-3 py-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder={
              editingMessageId
                ? "Modifier ton message..."
                : "Écris un message..."
            }
            className="w-full bg-transparent resize-none outline-none text-sm max-h-28 text-slate-100 placeholder:text-slate-500"
          />
          <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
            <span>
              {input.length}/{MAX_LEN}
            </span>
            {editingMessageId && (
              <span className="text-indigo-300">Mode édition</span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSend}
          className="px-4 py-2 rounded-2xl text-xs font-semibold bg-indigo-500/90 hover:bg-indigo-400 text-white disabled:opacity-40 disabled:hover:bg-indigo-500/90 transition"
        >
          {editingMessageId ? "Enregistrer" : "Envoyer"}
        </button>
      </form>
    </div>
  );
}
