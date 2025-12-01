// app/chat/[roomId]/_components/MessageList.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

import MessageRow, { MsgItem } from "./MessageRow";
import type { Message, ToastState } from "../chatTypes";

/* ---------------- CONSTS ---------------- */

const GROUP_WINDOW_MS = 4 * 60 * 1000;
const NEAR_BOTTOM_PX = 220;
const TAIL = 60; // tail rebuild, safe même si prepend

/* ---------------- MOTION VARIANTS ---------------- */

const toastVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: { duration: 0.18, ease: "easeIn" },
  },
} satisfies Variants;

const popoverVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.16 } },
  exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } },
};

const newMsgBtnVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.12 } },
};

/* ---------------- DATE HELPERS ---------------- */

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const day = startOfDay(d);
  const today = startOfDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;

  if (day === today) return "Aujourd’hui";
  if (day === yesterday) return "Hier";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/* ---------------- MENTIONS ---------------- */

const MENTION_REGEX = /@[\w.-]+/g;

function parseMentions(text: string) {
  MENTION_REGEX.lastIndex = 0;
  const parts: Array<{ type: "text" | "mention"; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const idx = match.index;
    if (idx > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, idx) });
    }
    parts.push({ type: "mention", value: match[0] });
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}

/* ---------------- VIRTUAL ITEMS ---------------- */

type DayItem = { type: "day"; key: string; label: string };
type UnreadItem = { type: "unread"; key: string };
type VItem = DayItem | UnreadItem | MsgItem;

type PopoverState = { username: string; x: number; y: number } | null;

/* ---------------- SCROLL UTILS ---------------- */

function getScrollableEl(el: HTMLElement | Window | null): HTMLElement | null {
  if (!el) return null;
  if (el instanceof HTMLElement) return el;

  const scrolling = document.scrollingElement;
  if (scrolling instanceof HTMLElement) return scrolling;

  return document.documentElement instanceof HTMLElement
    ? document.documentElement
    : null;
}

/* ---------------- PROPS ---------------- */

type Props = {
  messages: Message[];
  lastReadAt: string | null;
  currentUserId: string;
  effectiveUsername: string;
  highlightedId: string | null;
  onUserClick?: (userId: string) => void;

  onIndexMapChange: (map: Record<string, number>) => void;
  onNearBottomChange: (near: boolean) => void;
  onAtBottomRead: () => void;

  loadOlder: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  firstItemIndex: number;

  newBelowCount: number;
  setNewBelowCount: React.Dispatch<React.SetStateAction<number>>;

  onJumpToMessage: (id: string) => void;

  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
  onDelete: (id: string) => void;

  toast: ToastState;
  setToast: React.Dispatch<React.SetStateAction<ToastState>>;
};

/* ---------------- MAIN ---------------- */

export default function MessageList({
  messages,
  lastReadAt,
  currentUserId,
  effectiveUsername,
  highlightedId,
  onUserClick,
  onIndexMapChange,
  onNearBottomChange,
  onAtBottomRead,
  loadOlder,
  hasMore,
  isLoadingMore,
  firstItemIndex,
  newBelowCount,
  setNewBelowCount,
  onJumpToMessage,
  onReply,
  onEdit,
  onDelete,
  toast,
  setToast,
}: Props) {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const scrollerRef = useRef<HTMLElement | Window | null>(null);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [popover, setPopover] = useState<PopoverState>(null);

  /* ---------- DELTA-ONLY MENTION CACHES (safe même avec prepend) ---------- */

  const mentionPartsRef = useRef(
    new Map<string, ReturnType<typeof parseMentions>>()
  );
  const mentionUserByNameRef = useRef(new Map<string, string>());
  const knownIdsRef = useRef(new Set<string>());

  useEffect(() => {
    for (const m of messages) {
      if (knownIdsRef.current.has(m.id)) continue;
      knownIdsRef.current.add(m.id);

      if (!m.deletedAt) {
        mentionPartsRef.current.set(m.id, parseMentions(m.content));
      }
      if (m.author.username) {
        mentionUserByNameRef.current.set(
          m.author.username.toLowerCase(),
          m.author.id
        );
      }
      if (m.replyTo?.author?.username) {
        mentionUserByNameRef.current.set(
          m.replyTo.author.username.toLowerCase(),
          m.replyTo.author.id
        );
      }
    }
  }, [messages]);

  const renderContentWithMentions = useCallback(
    (msgId: string, text: string) => {
      const parts = mentionPartsRef.current.get(msgId) ?? parseMentions(text);

      return parts.map((p, i) => {
        if (p.type === "text") return <span key={`t-${i}`}>{p.value}</span>;

        const raw = p.value.slice(1);
        const userId = mentionUserByNameRef.current.get(raw.toLowerCase());

        return (
          <button
            key={`m-${i}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              userId && onUserClick?.(userId);
            }}
            onMouseEnter={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setPopover({
                username: raw,
                x: r.left + r.width / 2,
                y: r.top - 8,
              });
            }}
            onMouseLeave={() => setPopover(null)}
            className="inline-flex"
          >
            <span className="font-semibold text-indigo-200 bg-indigo-500/10 px-1 py-0.5 rounded-md ring-1 ring-indigo-400/20 hover:bg-indigo-500/15 transition">
              @{raw}
            </span>
          </button>
        );
      });
    },
    [onUserClick]
  );

  /* ---------- CLOSE SELECTION ON OUTSIDE / ESC ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedMessageId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-msg-root='true']")) return;
      setSelectedMessageId(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  /* ---------- UNREAD MARKER ---------- */

  const unreadMarkerId = useMemo(() => {
    if (!lastReadAt) return null;
    const t = new Date(lastReadAt).getTime();
    const firstUnread = messages.find(
      (m) => new Date(m.createdAt).getTime() > t
    );
    return firstUnread?.id ?? null;
  }, [messages, lastReadAt]);

  /* ---------- ITEMS (tail-opt SAFE) ---------- */

  const items: VItem[] = useMemo(() => {
    const out: VItem[] = [];
    let lastDayKey: string | null = null;
    let prevMsg: Message | null = null;
    let prevGroupMeta:
      | { startIdx: number; groupIndex: number; groupSize: number }
      | null = null;

    const start = Math.max(0, messages.length - TAIL);
    // head = old messages no grouping recompute fine-grain
    // but we still iterate all to keep correctness.
    // Tail-opt instead avoids heavy extra logic elsewhere.

    for (let index = 0; index < messages.length; index++) {
      const m = messages[index];

      if (unreadMarkerId && m.id === unreadMarkerId) {
        out.push({ type: "unread", key: `unread-${m.id}` });
        prevMsg = null;
        prevGroupMeta = null;
      }

      const d = new Date(m.createdAt);
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

      if (dayKey !== lastDayKey) {
        out.push({
          type: "day",
          key: `day-${dayKey}`,
          label: dayLabel(m.createdAt),
        });
        lastDayKey = dayKey;
        prevMsg = null;
        prevGroupMeta = null;
      }

      const groupedWithPrev =
        !!prevMsg &&
        prevMsg.author.id === m.author.id &&
        !prevMsg.deletedAt &&
        !m.deletedAt &&
        d.getTime() - new Date(prevMsg.createdAt).getTime() < GROUP_WINDOW_MS;

      let groupIndex = 0;
      let groupSize = 1;

      if (groupedWithPrev && prevGroupMeta) {
        groupIndex = prevGroupMeta.groupIndex + 1;
        groupSize = prevGroupMeta.groupSize + 1;
      }

      const item: MsgItem = {
        type: "msg",
        key: m.id,
        msg: m,
        index,
        groupedWithPrev,
        groupIndex,
        groupSize,
      };

      out.push(item);

      if (!groupedWithPrev) {
        prevGroupMeta = {
          startIdx: out.length - 1,
          groupIndex: 0,
          groupSize: 1,
        };
      } else if (prevGroupMeta) {
        prevGroupMeta.groupSize = groupSize;
        prevGroupMeta.groupIndex = groupIndex;

        // update only group in tail area to limit work
        if (index >= start) {
          for (let k = prevGroupMeta.startIdx; k < out.length; k++) {
            const it2 = out[k];
            if (it2.type === "msg") it2.groupSize = groupSize;
          }
        }
      }

      prevMsg = m;
    }

    return out;
  }, [messages, unreadMarkerId]);

  useEffect(() => {
    const map: Record<string, number> = {};
    items.forEach((it, idx) => {
      if (it.type === "msg") map[it.msg.id] = idx;
    });
    onIndexMapChange(map);
  }, [items, onIndexMapChange]);

  /* ---------- SCROLL EVENTS ---------- */

  const scrollToBottom = useCallback(
    (smooth = true) => {
      virtuosoRef.current?.scrollToIndex({
        index: items.length - 1,
        behavior: smooth ? "smooth" : "auto",
        align: "end",
      });
      setNewBelowCount(0);
      onNearBottomChange(true);
    },
    [items.length, onNearBottomChange, setNewBelowCount]
  );

  const scrollToBottomImmediate = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: items.length - 1,
      behavior: "auto",
      align: "end",
    });
    setNewBelowCount(0);
    onNearBottomChange(true);
  }, [items.length, onNearBottomChange, setNewBelowCount]);

  useEffect(() => {
    const onScrollToBottomEv = () => scrollToBottom(true);
    const onScrollToBottomImmediateEv = () => scrollToBottomImmediate();
    const onScrollToIndex = (e: Event) => {
      const ce = e as CustomEvent<{ index: number }>;
      virtuosoRef.current?.scrollToIndex({
        index: ce.detail.index,
        behavior: "smooth",
        align: "center",
      });
    };

    window.addEventListener("chat:scrollToBottom", onScrollToBottomEv);
    window.addEventListener(
      "chat:scrollToBottomImmediate",
      onScrollToBottomImmediateEv
    );
    window.addEventListener("chat:scrollToIndex", onScrollToIndex);

    return () => {
      window.removeEventListener("chat:scrollToBottom", onScrollToBottomEv);
      window.removeEventListener(
        "chat:scrollToBottomImmediate",
        onScrollToBottomImmediateEv
      );
      window.removeEventListener("chat:scrollToIndex", onScrollToIndex);
    };
  }, [scrollToBottom, scrollToBottomImmediate]);

  const handleScroll = useCallback(() => {
    const rawEl = scrollerRef.current;
    const el = getScrollableEl(rawEl);
    if (!el) return;

    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = dist <= NEAR_BOTTOM_PX;

    onNearBottomChange(near);

    if (near) {
      setNewBelowCount(0);
      onAtBottomRead();
    }
    if (popover) setPopover(null);
  }, [popover, onAtBottomRead, onNearBottomChange, setNewBelowCount]);

  /* ---------- ITEM RENDERER ---------- */

  const renderItem = useCallback(
    (_index: number, it: VItem) => {
      if (it.type === "day") {
        return (
          <div className="relative my-2 flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-white/10" />
            <span className="relative z-10 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300 backdrop-blur">
              {it.label}
            </span>
          </div>
        );
      }

      if (it.type === "unread") {
        return (
          <div className="sticky top-0 z-20 my-2 flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-indigo-400/30" />
            <span className="relative z-10 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-indigo-200 backdrop-blur">
              Non lus
            </span>
          </div>
        );
      }

      return (
        <MessageRow
          it={it}
          currentUserId={currentUserId}
          effectiveUsername={effectiveUsername}
          highlightedId={highlightedId}
          selectedMessageId={selectedMessageId}
          onSelect={setSelectedMessageId}
          onUserClick={onUserClick}
          onJumpToMessage={onJumpToMessage}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          renderContentWithMentions={renderContentWithMentions}
        />
      );
    },
    [
      currentUserId,
      effectiveUsername,
      highlightedId,
      selectedMessageId,
      onUserClick,
      onJumpToMessage,
      onReply,
      onEdit,
      onDelete,
      renderContentWithMentions,
    ]
  );

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            variants={toastVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed bottom-20 right-6 z-50"
          >
            <button
              type="button"
              onClick={() => {
                onJumpToMessage(toast.messageId);
                setToast(null);
              }}
              className="text-left max-w-xs rounded-2xl border border-white/10 bg-black/80 px-3.5 py-2.5 shadow-[0_18px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl transition hover:bg-black/90"
            >
              <div className="text-[11px] text-indigo-300 mb-0.5 uppercase tracking-wider">
                Nouveau message pour toi
              </div>
              <div className="text-[12px] text-slate-200 leading-snug">
                <span className="font-semibold">
                  {toast.authorName ?? "Utilisateur"}
                </span>
                <span className="text-slate-500"> — </span>
                <span>{toast.preview}</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Cliquer pour voir
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mention popover */}
      <AnimatePresence>
        {popover && (
          <motion.div
            variants={popoverVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{
              position: "fixed",
              left: popover.x,
              top: popover.y,
              transform: "translate(-50%, -100%)",
            }}
            className="z-50 w-56 rounded-2xl border border-white/10 bg-black/90 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Mention
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              @{popover.username}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Cliquer pour voir le profil
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Virtual list */}
      <div className="relative flex-1 min-h-0 bg-black/15">
        <Virtuoso
          ref={virtuosoRef}
          data={items}
          itemContent={renderItem}
          firstItemIndex={firstItemIndex}
          startReached={loadOlder}
          followOutput={false}
          scrollerRef={(el) => {
            scrollerRef.current = el;
          }}
          onScroll={handleScroll}
          atBottomStateChange={(atBottom) => {
            onNearBottomChange(atBottom);
            if (atBottom) {
              setNewBelowCount(0);
              onAtBottomRead();
            }
          }}
          components={{
            Header: () =>
              hasMore ? (
                <div className="py-2 text-center text-[11px] text-slate-500">
                  {isLoadingMore ? "Chargement..." : "Remonter pour charger plus"}
                </div>
              ) : (
                <div className="py-2 text-center text-[11px] text-slate-600">
                  Début de la conversation
                </div>
              ),
          }}
          className="h-full px-4 py-3 scrollbar-talkto scrollbar-idle"
        />

        {/* New messages btn */}
        <AnimatePresence>
          {newBelowCount > 0 && (
            <motion.button
              variants={newMsgBtnVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              type="button"
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/80 px-3.5 py-2 text-[11px] font-semibold text-slate-100 shadow-lg backdrop-blur-xl hover:bg-black/95 transition"
            >
              Nouveaux messages{newBelowCount > 1 ? ` (${newBelowCount})` : ""}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
