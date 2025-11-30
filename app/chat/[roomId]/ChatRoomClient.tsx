// app/chat/[roomId]/ChatRoomClient.tsx
"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { pusherClient } from "@/lib/pusher/client";
import {
  sendMessageAction,
  editMessageAction,
  deleteMessageAction,
} from "./actions";
import { emitTypingPresence } from "./_hooks/useTypingPresence";

/* ---------------- TYPES ---------------- */

type Author = {
  id: string;
  username: string | null;
  image: string | null;
  role: string | null;
};

type ReplyTo = {
  id: string;
  content: string;
  author: {
    id: string;
    username: string | null;
  };
};

export type Message = {
  id: string;
  content: string;
  createdAt: string;
  isEdited: boolean;
  deletedAt: string | null;
  author: Author;
  replyTo: ReplyTo | null;
};

type MentionUser = {
  id: string;
  username: string;
};

type ToastState =
  | {
      id: string;
      messageId: string;
      authorName: string | null;
      preview: string;
    }
  | null;

export type ChatRoomHandle = {
  hasMessage: (id: string) => boolean;
  mergeMessages: (msgs: Message[]) => void;
  jumpToMessage: (id: string) => void;
};

type Props = {
  roomId: string;
  roomSlug: string;
  roomName: string;
  currentUserId: string;
  currentUsername: string;
  initialMessages: Message[];
  onUserClick?: (userId: string) => void;

  initialCursor?: string | null;
  initialLastReadAt?: string | null;
};

/* ---------------- API CLIENT ---------------- */

async function fetchOlderMessages(roomId: string, cursor: string | null) {
  const res = await fetch(
    `/api/chat/history?roomId=${roomId}${cursor ? `&cursor=${cursor}` : ""}`
  );
  if (!res.ok) throw new Error("history fetch failed");
  return (await res.json()) as {
    messages: Message[];
    nextCursor: string | null;
  };
}

async function fetchLastRead(roomId: string) {
  const res = await fetch(`/api/chat/last-read?roomId=${roomId}`);
  if (!res.ok) return { lastReadAt: null as string | null };
  return (await res.json()) as { lastReadAt: string | null };
}

async function persistLastRead(roomId: string, lastReadAt: string) {
  await fetch(`/api/chat/last-read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, lastReadAt }),
  });
}

/* ---------------- CONSTS ---------------- */

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const MENTION_REGEX = /@[\w.-]+/g;

const COOLDOWN_MS_SAFE_DEBATE = 15_000;
const MAX_MENTION_SUGGESTIONS = 10;
const GROUP_WINDOW_MS = 4 * 60 * 1000;
const NEAR_BOTTOM_PX = 220;

const TYPING_THROTTLE_MS = 1500;
const TOAST_MS = 5000;
const MAX_LEN = 2000;

function containsEmoji(str: string) {
  return EMOJI_REGEX.test(str);
}

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

const actionsVariants = {
  hidden: { opacity: 0, y: 2 },
  show: { opacity: 1, y: 0, transition: { duration: 0.12 } },
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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------- MENTIONS ---------------- */

type PopoverState = { username: string; x: number; y: number } | null;

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
type MsgItem = {
  type: "msg";
  key: string;
  msg: Message;
  index: number;
  groupedWithPrev: boolean;
  groupIndex: number;
  groupSize: number;
};
type VItem = DayItem | UnreadItem | MsgItem;

/* ---------------- SCROLL UTILS (FIX TS) ---------------- */

// Retourne toujours un HTMLElement scrollable si possible.
function getScrollableEl(
  el: HTMLElement | Window | null
): HTMLElement | null {
  if (!el) return null;
  if (el instanceof HTMLElement) return el;

  // cas Window : on prend l'élément qui scrolle réellement
  const scrolling = document.scrollingElement;
  if (scrolling instanceof HTMLElement) return scrolling;

  return document.documentElement instanceof HTMLElement
    ? document.documentElement
    : null;
}

/* ---------------- MAIN ---------------- */

const ChatRoomClient = forwardRef<ChatRoomHandle, Props>(function ChatRoomClient(
  {
    roomId,
    roomSlug,
    roomName,
    currentUserId,
    currentUsername,
    initialMessages,
    onUserClick,
    initialCursor = null,
    initialLastReadAt = null,
  },
  ref
) {
  /* ---------- STATE ---------- */

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState<boolean>(!!initialCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [lastReadAt, setLastReadAt] = useState<string | null>(
    initialLastReadAt
  );

  const [input, setInput] = useState("");

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyToTarget, setReplyToTarget] = useState<Message | null>(null);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);

  const [popover, setPopover] = useState<PopoverState>(null);

  const [newBelowCount, setNewBelowCount] = useState(0);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );

  const isSafeDebate = roomSlug === "safe-debate";
  const effectiveUsername = currentUsername ?? "";

  /* ---------- REFS ---------- */

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  // ✅ FIX: accepte Window aussi
  const scrollerRef = useRef<HTMLElement | Window | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isNearBottomRef = useRef(true);
  const lastTypingSentRef = useRef<number>(0);

  const indexByMessageIdRef = useRef<Record<string, number>>({});

  const firstItemIndexRef = useRef(10_000);
  const [firstItemIndex, setFirstItemIndex] = useState(
    firstItemIndexRef.current
  );

  /* ---------- IMPERATIVE API ---------- */

  useImperativeHandle(
    ref,
    () => ({
      hasMessage: (id: string) => indexByMessageIdRef.current[id] != null,

      mergeMessages: (msgs: Message[]) => {
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const m of msgs) map.set(m.id, m);
          return Array.from(map.values()).sort(
            (a, b) =>
              new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()
          );
        });
      },

      jumpToMessage: (id: string) => {
        scrollToMessage(id);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
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

  /* ---------- INIT LAST READ ---------- */

  useEffect(() => {
    if (initialLastReadAt !== null) return;
    void (async () => {
      const r = await fetchLastRead(roomId);
      setLastReadAt(r.lastReadAt);
    })();
  }, [roomId, initialLastReadAt]);

  /* ---------- AUTO-RESIZE TEXTAREA ---------- */

  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 112) + "px";
  }, [input]);

  /* ---------- MENTION USERS ---------- */

  const mentionUsers: MentionUser[] = useMemo(() => {
    const map = new Map<string, { username: string; lastSeenIndex: number }>();

    messages.forEach((m, index) => {
      if (m.author.username) {
        map.set(m.author.id, {
          username: m.author.username,
          lastSeenIndex: index,
        });
      }
      if (m.replyTo?.author?.username) {
        map.set(m.replyTo.author.id, {
          username: m.replyTo.author.username,
          lastSeenIndex: index,
        });
      }
    });

    if (currentUsername) {
      const existing = map.get(currentUserId);
      map.set(currentUserId, {
        username: currentUsername,
        lastSeenIndex: existing?.lastSeenIndex ?? messages.length + 1,
      });
    }

    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        username: v.username,
        lastSeenIndex: v.lastSeenIndex,
      }))
      .sort((a, b) => b.lastSeenIndex - a.lastSeenIndex)
      .map(({ id, username }) => ({ id, username }));
  }, [messages, currentUserId, currentUsername]);

  const mentionUserByName = useMemo(() => {
    const m = new Map<string, MentionUser>();
    for (const u of mentionUsers) m.set(u.username.toLowerCase(), u);
    return m;
  }, [mentionUsers]);

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

  /* ---------- LOAD OLDER ---------- */

  const loadOlder = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const { messages: older, nextCursor } = await fetchOlderMessages(
        roomId,
        cursor
      );

      if (!older.length) {
        setHasMore(false);
        setCursor(null);
        return;
      }

      setMessages((prev) => [...older, ...prev]);

      firstItemIndexRef.current -= older.length;
      setFirstItemIndex(firstItemIndexRef.current);

      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [roomId, cursor, hasMore, isLoadingMore]);

  /* ---------- LAST READ PERSIST ---------- */

  const flushLastRead = useCallback(
    (iso: string) => {
      setLastReadAt(iso);
      void persistLastRead(roomId, iso);
    },
    [roomId]
  );

  const markAllReadIfAtBottom = useCallback(() => {
    if (!messages.length) return;
    flushLastRead(messages[messages.length - 1].createdAt);
  }, [messages, flushLastRead]);

  useEffect(() => {
    return () => {
      if (isNearBottomRef.current) markAllReadIfAtBottom();
    };
  }, [markAllReadIfAtBottom]);

  /* ---------- GROUPING + DAY + UNREAD ---------- */

  const unreadMarkerId = useMemo(() => {
    if (!lastReadAt) return null;
    const t = new Date(lastReadAt).getTime();
    const firstUnread = messages.find(
      (m) => new Date(m.createdAt).getTime() > t
    );
    return firstUnread?.id ?? null;
  }, [messages, lastReadAt]);

  const items: VItem[] = useMemo(() => {
    const out: VItem[] = [];
    let lastDayKey: string | null = null;
    let prevMsg: Message | null = null;

    let prevGroupMeta:
      | { startIdx: number; groupIndex: number; groupSize: number }
      | null = null;

    messages.forEach((m, index) => {
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

        for (let k = prevGroupMeta.startIdx; k < out.length; k++) {
          const it2 = out[k];
          if (it2.type === "msg") it2.groupSize = groupSize;
        }
      }

      prevMsg = m;
    });

    return out;
  }, [messages, unreadMarkerId]);

  useEffect(() => {
    const map: Record<string, number> = {};
    items.forEach((it, idx) => {
      if (it.type === "msg") map[it.msg.id] = idx;
    });
    indexByMessageIdRef.current = map;
  }, [items]);

  /* ---------- SCROLL HELPERS ---------- */

  const scrollToBottom = useCallback((smooth = true) => {
    virtuosoRef.current?.scrollToIndex({
      index: items.length - 1,
      behavior: smooth ? "smooth" : "auto",
      align: "end",
    });
    setNewBelowCount(0);
    isNearBottomRef.current = true;
  }, [items.length]);

  const scrollToMessage = useCallback((messageId: string) => {
    const idx = indexByMessageIdRef.current[messageId];
    if (idx == null) return;

    virtuosoRef.current?.scrollToIndex({
      index: idx,
      behavior: "smooth",
      align: "center",
    });

    setHighlightedId(messageId);
    window.setTimeout(() => {
      setHighlightedId((cur) => (cur === messageId ? null : cur));
    }, 1200);
  }, []);

  /* ---------- TYPING ---------- */

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
    lastTypingSentRef.current = now;

    void window.fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });

    emitTypingPresence({
      roomId,
      isTyping: true,
      userId: currentUserId,
      username: effectiveUsername || undefined,
      source: "user",
    });
  }, [roomId, currentUserId, effectiveUsername]);

  const stopTyping = useCallback(() => {
    emitTypingPresence({
      roomId,
      isTyping: false,
      userId: currentUserId,
      username: effectiveUsername || undefined,
      source: "user",
    });
  }, [roomId, currentUserId, effectiveUsername]);

  /* ---------- INSERT MENTION ---------- */

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

  /* ---------- SEND / EDIT (NO JUMP) ---------- */

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

    const editingId = editingMessageId;
    const replyToId = replyToTarget?.id ?? undefined;
    const wasAtBottom = isNearBottomRef.current;

    setInput("");
    setEditingMessageId(null);
    setReplyToTarget(null);
    setMentionQuery(null);
    setMentionIndex(0);
    stopTyping();

    const optimisticId = `optimistic-${Date.now()}`;

    if (!editingId) {
      const optimistic: Message = {
        id: optimisticId,
        content: trimmed,
        createdAt: new Date().toISOString(),
        isEdited: false,
        deletedAt: null,
        author: {
          id: currentUserId,
          username: currentUsername ?? "Moi",
          image: null,
          role: null,
        },
        replyTo: replyToTarget
          ? {
              id: replyToTarget.id,
              content: replyToTarget.content,
              author: {
                id: replyToTarget.author.id,
                username: replyToTarget.author.username,
              },
            }
          : null,
      };

      setMessages((prev) => [...prev, optimistic]);

      if (wasAtBottom) {
        requestAnimationFrame(() => scrollToBottom(false));
      }
    }

    try {
      if (editingId) await editMessageAction(editingId, trimmed);
      else await sendMessageAction(roomId, trimmed, replyToId);

      if (isSafeDebate) {
        setCooldownUntil(Date.now() + COOLDOWN_MS_SAFE_DEBATE);
      }

      if (wasAtBottom) {
        scrollToBottom(true);
        markAllReadIfAtBottom();
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
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
    roomId,
    scrollToBottom,
    currentUserId,
    currentUsername,
    markAllReadIfAtBottom,
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
        setEditingMessageId(null);
        setReplyToTarget(null);
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
    [mentionQuery, filteredMentionUsers, mentionIndex, insertMention, send]
  );

  /* ---------- PUSHER ---------- */

  useEffect(() => {
    const channelName = `private-chat-${roomId}`;
    const channel = pusherClient.subscribe(channelName);

    const onNewMessage = (data: Message) => {
      setMessages((prev) => {
        if (data.author.id === currentUserId) {
          const idx = prev.findIndex(
            (m) =>
              m.id.startsWith("optimistic-") &&
              m.author.id === data.author.id &&
              m.content === data.content
          );
          if (idx !== -1) {
            const copy = prev.slice();
            copy[idx] = data;
            return copy;
          }
        }
        return [...prev, data];
      });

      if (!isNearBottomRef.current) {
        setNewBelowCount((n) => n + 1);
      } else {
        requestAnimationFrame(() => scrollToBottom(false));
        markAllReadIfAtBottom();
      }

      const isMe = data.author.id === currentUserId;
      if (isMe) return;

      const repliedToMe = data.replyTo?.author.id === currentUserId;
      const mentionedByName =
        !!currentUsername &&
        data.content
          .toLowerCase()
          .includes(`@${currentUsername.toLowerCase()}`);

      if (!repliedToMe && !mentionedByName) return;

      const preview =
        data.content.length > 80
          ? data.content.slice(0, 77) + "…"
          : data.content;

      const toastData: ToastState = {
        id: data.id,
        messageId: data.id,
        authorName: data.author.username,
        preview,
      };

      setToast(toastData);
      window.setTimeout(() => {
        setToast((cur) => (cur?.id === toastData.id ? null : cur));
      }, TOAST_MS);
    };

    const onEditMessage = (data: Message) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.id ? { ...m, ...data } : m))
      );
    };

    const onDeleteMessage = (data: { id: string; deletedAt: string | null }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === data.id) return { ...m, deletedAt: data.deletedAt };
          if (m.replyTo && m.replyTo.id === data.id) {
            return {
              ...m,
              replyTo: { ...m.replyTo, content: "Message supprimé" },
            };
          }
          return m;
        })
      );
    };

    const onTyping = (data: { userId: string; username: string | null }) => {
      if (data.userId === currentUserId) return;
      emitTypingPresence({
        roomId,
        isTyping: true,
        userId: data.userId,
        username: data.username ?? undefined,
        source: "other",
      });
    };

    channel.bind("new-message", onNewMessage);
    channel.bind("edit-message", onEditMessage);
    channel.bind("delete-message", onDeleteMessage);
    channel.bind("typing", onTyping);

    return () => {
      channel.unbind("new-message", onNewMessage);
      channel.unbind("edit-message", onEditMessage);
      channel.unbind("delete-message", onDeleteMessage);
      channel.unbind("typing", onTyping);
      pusherClient.unsubscribe(channelName);
    };
  }, [
    roomId,
    currentUserId,
    currentUsername,
    scrollToBottom,
    markAllReadIfAtBottom,
  ]);

  /* ---------- MENTION CACHE ---------- */

  const mentionPartsByMsgId = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof parseMentions>>();
    for (const m of messages) {
      if (!m.deletedAt) cache.set(m.id, parseMentions(m.content));
    }
    return cache;
  }, [messages]);

  const renderContentWithMentions = useCallback(
    (msgId: string, text: string) => {
      const parts = mentionPartsByMsgId.get(msgId) ?? parseMentions(text);

      return parts.map((p, i) => {
        if (p.type === "text") return <span key={`t-${i}`}>{p.value}</span>;

        const raw = p.value.slice(1);
        const user = mentionUserByName.get(raw.toLowerCase());

        return (
          <button
            key={`m-${i}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              user && onUserClick?.(user.id);
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
    [mentionPartsByMsgId, mentionUserByName, onUserClick]
  );

  const canSend =
    !!input.trim() &&
    !(isSafeDebate && cooldownRemaining !== null && cooldownRemaining > 0);

  /* ---------- SCROLLER (FIXED) ---------- */

  const handleScroll = useCallback(() => {
    const rawEl = scrollerRef.current;
    const el = getScrollableEl(rawEl);
    if (!el) return;

    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = dist <= NEAR_BOTTOM_PX;

    isNearBottomRef.current = near;

    if (near) {
      setNewBelowCount(0);
      markAllReadIfAtBottom();
    }
    if (popover) setPopover(null);
  }, [popover, markAllReadIfAtBottom]);

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

      const m = it.msg;
      const groupedWithPrev = it.groupedWithPrev;
      const { groupSize } = it;

      const isMe = m.author.id === currentUserId;
      const showBadge = m.author.role && m.author.role !== "USER";
      const isDeleted = !!m.deletedAt;

      const repliedToMe = m.replyTo?.author.id === currentUserId;
      const mentionedByName =
        !!effectiveUsername &&
        !isMe &&
        m.content
          .toLowerCase()
          .includes(`@${effectiveUsername.toLowerCase()}`);

      const isMentioned = !isDeleted && (mentionedByName || repliedToMe);
      const displayContent = isDeleted ? "Message supprimé" : m.content;

      const authorLabel = m.author.username ?? "Utilisateur";
      const isSelected = selectedMessageId === m.id;

      const showAvatar = !groupedWithPrev;
      const showStack = showAvatar && groupSize >= 3;

      return (
        <div
          data-msg-root="true"
          onClick={() =>
            setSelectedMessageId((cur) => (cur === m.id ? null : m.id))
          }
          className={`
            group flex gap-3 px-2.5 py-2 rounded-xl transition cursor-pointer
            ${
              isMentioned
                ? "bg-indigo-500/10 ring-1 ring-indigo-400/20"
                : "hover:bg-white/[0.03]"
            }
            ${
              highlightedId === m.id
                ? "ring-1 ring-indigo-500/70 ring-offset-2 ring-offset-black/60"
                : ""
            }
            ${isSelected ? "bg-white/[0.05] ring-1 ring-white/10" : ""}
          `}
        >
          {/* Avatar grouped */}
          <div className="relative mt-0.5 h-9 w-9 flex-shrink-0">
            {showAvatar ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUserClick?.(m.author.id);
                }}
                className="
                  h-9 w-9 rounded-full bg-white/5 ring-1 ring-white/10
                  flex items-center justify-center overflow-hidden
                  hover:ring-indigo-500/50 hover:ring-offset-2 hover:ring-offset-black/60
                  transition
                "
              >
                {m.author.image ? (
                  <Image
                    src={m.author.image}
                    alt={authorLabel}
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-300">
                    {authorLabel[0]?.toUpperCase()}
                  </span>
                )}
              </button>
            ) : (
              <div className="h-9 w-9" />
            )}

            {showStack && (
              <div className="absolute -bottom-1 -right-1 flex">
                <span className="h-3 w-3 rounded-full bg-white/10 ring-1 ring-white/10" />
                <span className="-ml-1 h-3 w-3 rounded-full bg-white/20 ring-1 ring-white/10" />
                <span className="-ml-1 h-3 w-3 rounded-full bg-white/30 ring-1 ring-white/10" />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0">
            {m.replyTo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToMessage(m.replyTo!.id);
                }}
                className="mb-1 text-[10px] text-slate-400 border-l border-white/10 pl-2 hover:text-slate-200 hover:border-white/20 transition text-left"
              >
                <div className="truncate">
                  <span className="opacity-70">En réponse à </span>
                  <span className="font-medium">
                    {m.replyTo.author.username ?? "Utilisateur"}
                  </span>
                  <span className="text-slate-500">
                    {" "}
                    « {m.replyTo.content} »
                  </span>
                </div>
              </button>
            )}

            {/* Header line */}
            <div className="flex items-center gap-2">
              {!groupedWithPrev ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUserClick?.(m.author.id);
                    }}
                    className="text-[14px] font-semibold text-slate-100 hover:underline underline-offset-2"
                  >
                    {authorLabel}
                  </button>

                  {showBadge && (
                    <span
                      className={`px-1 py-0.5 rounded-full text-[9px] border uppercase tracking-wide leading-none ${
                        m.author.role === "ADMIN" || m.author.role === "DEV"
                          ? "border-fuchsia-400/70 bg-fuchsia-500/10 text-fuchsia-200"
                          : m.author.role === "MODERATOR" ||
                            m.author.role === "SUPPORT"
                          ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-200"
                          : "border-white/20 bg-white/5 text-slate-300"
                      }`}
                    >
                      {m.author.role}
                    </span>
                  )}
                </>
              ) : (
                <div className="text-[10px] text-slate-500">
                  {fmtTime(m.createdAt)}
                </div>
              )}

              {!groupedWithPrev && (
                <span className="text-[10px] text-slate-500">
                  {fmtTime(m.createdAt)}
                  {m.isEdited && !isDeleted && " · modifié"}
                </span>
              )}
            </div>

            {/* Content */}
            <div
              className={`mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed ${
                isDeleted ? "text-slate-500 italic" : "text-slate-100"
              }`}
            >
              {isDeleted
                ? displayContent
                : renderContentWithMentions(m.id, displayContent)}
            </div>

            {/* Actions */}
            <div className="mt-1 min-h-[18px]">
              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.div
                    variants={actionsVariants}
                    initial="hidden"
                    animate="show"
                    exit="hidden"
                    className="flex gap-3 text-[11px] text-slate-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setReplyToTarget(m)}
                      className="hover:underline underline-offset-2"
                    >
                      Répondre
                    </button>

                    {isMe && !isDeleted && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setInput(m.content);
                            setEditingMessageId(m.id);
                            textareaRef.current?.focus();
                          }}
                          className="hover:underline underline-offset-2"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMessageAction(m.id)}
                          className="hover:text-red-300 hover:underline underline-offset-2"
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {!isSelected && (
                <div className="text-[10px] text-slate-500/70 select-none">
                  Appuie pour actions
                </div>
              )}
            </div>
          </div>
        </div>
      );
    },
    [
      currentUserId,
      effectiveUsername,
      highlightedId,
      onUserClick,
      renderContentWithMentions,
      scrollToMessage,
      selectedMessageId,
    ]
  );

  return (
    <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
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
                scrollToMessage(toast.messageId);
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
          followOutput="smooth"
          // ✅ FIX: accepte HTMLElement | Window | null
          scrollerRef={(el) => {
            scrollerRef.current = el;
          }}
          onScroll={handleScroll}
          atBottomStateChange={(atBottom) => {
            isNearBottomRef.current = atBottom;
            if (atBottom) {
              setNewBelowCount(0);
              markAllReadIfAtBottom();
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

      {/* Input area */}
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
                onClick={() => setReplyToTarget(null)}
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
    </div>
  );
});

export default ChatRoomClient;
