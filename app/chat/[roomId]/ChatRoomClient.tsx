// app/chat/[roomId]/ChatRoomClient.tsx
"use client";

import React, {
  forwardRef,
  startTransition,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { pusherClient } from "@/lib/pusher/client";
import {
  sendMessageAction,
  editMessageAction,
  deleteMessageAction,
} from "./actions";
import { emitTypingPresence } from "./_hooks/useTypingPresence";

import MessageList from "./_components/MessageList";
import Composer from "./_components/Composer";

import type {
  ChatRoomHandle,
  Message,
  Props,
  ToastState,
  MentionUser,
} from "./chatTypes";

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

const COOLDOWN_MS_SAFE_DEBATE = 15_000;
const TYPING_THROTTLE_MS = 1500;
const TOAST_MS = 5000;

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

  const [toast, setToast] = useState<ToastState>(null);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [newBelowCount, setNewBelowCount] = useState(0);

  // targets venant de la liste
  const [editingTarget, setEditingTarget] = useState<Message | null>(null);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);

  const isSafeDebate = roomSlug === "safe-debate";
  const effectiveUsername = currentUsername ?? "";

  /* ---------- REFS ---------- */

  const isNearBottomRef = useRef(true);
  const lastTypingSentRef = useRef<number>(0);

  const indexByMessageIdRef = useRef<Record<string, number>>({});

  const firstItemIndexRef = useRef(10_000);
  const [firstItemIndex, setFirstItemIndex] = useState(
    firstItemIndexRef.current
  );

  // Mention users cache incrémental (pas de scan complet)
  const mentionUsersRef = useRef<Map<string, MentionUser>>(new Map());
  const prevMsgLenRef = useRef<number>(initialMessages.length);

  /* ---------- IMPERATIVE API ---------- */

  const scrollToMessage = useCallback((id: string) => {
    const idx = indexByMessageIdRef.current[id];
    if (idx == null) return;

    window.dispatchEvent(
      new CustomEvent("chat:scrollToIndex", { detail: { index: idx } })
    );

    setHighlightedId(id);
    window.setTimeout(() => {
      setHighlightedId((cur) => (cur === id ? null : cur));
    }, 1200);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      hasMessage: (id: string) => indexByMessageIdRef.current[id] != null,

      mergeMessages: (msgs: Message[]) => {
        startTransition(() => {
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]));
            for (const m of msgs) map.set(m.id, m);
            return Array.from(map.values()).sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            );
          });
        });
      },

      jumpToMessage: (id: string) => {
        scrollToMessage(id);
      },
    }),
    [scrollToMessage]
  );

  /* ---------- INIT LAST READ ---------- */

  useEffect(() => {
    if (initialLastReadAt !== null) return;
    void (async () => {
      const r = await fetchLastRead(roomId);
      setLastReadAt(r.lastReadAt);
    })();
  }, [roomId, initialLastReadAt]);

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

      // prepend older
      startTransition(() => {
        setMessages((prev) => [...older, ...prev]);
      });

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

  /* ---------- MENTION USERS INCREMENTAL (DELTA ONLY) ---------- */

  useEffect(() => {
    const prevLen = prevMsgLenRef.current;
    const nextLen = messages.length;

    for (let i = prevLen; i < nextLen; i++) {
      const m = messages[i];
      if (!m) continue;

      if (m.author.username) {
        mentionUsersRef.current.set(m.author.id, {
          id: m.author.id,
          username: m.author.username,
        });
      }
      if (m.replyTo?.author?.username) {
        mentionUsersRef.current.set(m.replyTo.author.id, {
          id: m.replyTo.author.id,
          username: m.replyTo.author.username,
        });
      }
    }

    if (currentUsername) {
      mentionUsersRef.current.set(currentUserId, {
        id: currentUserId,
        username: currentUsername,
      });
    }

    prevMsgLenRef.current = nextLen;
  }, [messages, currentUserId, currentUsername]);

  const getMentionUsers = useCallback(() => {
    return Array.from(mentionUsersRef.current.values());
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

  /* ---------- PUSHER ---------- */

  useEffect(() => {
    const channelName = `private-chat-${roomId}`;
    const channel = pusherClient.subscribe(channelName);

    const onNewMessage = (data: Message) => {
      startTransition(() => {
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
      });

      if (!isNearBottomRef.current) {
        setNewBelowCount((n) => n + 1);
      } else {
        window.dispatchEvent(new CustomEvent("chat:scrollToBottomImmediate"));
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
      startTransition(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.id ? { ...m, ...data } : m))
        );
      });
    };

    const onDeleteMessage = (data: { id: string; deletedAt: string | null }) => {
      startTransition(() => {
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
      });
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
  }, [roomId, currentUserId, currentUsername, markAllReadIfAtBottom]);

  /* ---------- SEND / EDIT / DELETE ---------- */

  const sendOrEdit = useCallback(
    async (
      text: string,
      editingMessageId: string | null,
      replyTo?: Message | null
    ) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const editingId = editingMessageId;
      const replyToId = replyTo?.id ?? undefined;
      const wasAtBottom = isNearBottomRef.current;

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
          replyTo: replyTo
            ? {
                id: replyTo.id,
                content: replyTo.content,
                author: {
                  id: replyTo.author.id,
                  username: replyTo.author.username,
                },
              }
            : null,
        };

        startTransition(() => {
          setMessages((prev) => [...prev, optimistic]);
        });

        if (wasAtBottom) {
          requestAnimationFrame(() => {
            window.dispatchEvent(
              new CustomEvent("chat:scrollToBottomImmediate")
            );
          });
        }
      }

      try {
        if (editingId) await editMessageAction(editingId, trimmed);
        else await sendMessageAction(roomId, trimmed, replyToId);

        if (wasAtBottom) {
          window.dispatchEvent(new CustomEvent("chat:scrollToBottom"));
          markAllReadIfAtBottom();
        }
      } catch (err: any) {
        console.error(err);
        startTransition(() => {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        });
        throw err;
      }
    },
    [
      currentUserId,
      currentUsername,
      roomId,
      markAllReadIfAtBottom,
    ]
  );

  const onDelete = useCallback((id: string) => {
    // delete optimiste visuel (optionnel mais souvent mieux)
    startTransition(() => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m
        )
      );
    });
    void deleteMessageAction(id);
  }, []);

  const clearTargets = useCallback(() => {
    setEditingTarget(null);
    setReplyTarget(null);
  }, []);

  /* ---------- RENDER ---------- */

  return (
    <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
      <MessageList
        messages={messages}
        lastReadAt={lastReadAt}
        currentUserId={currentUserId}
        effectiveUsername={effectiveUsername}
        highlightedId={highlightedId}
        onUserClick={onUserClick}
        onIndexMapChange={(map) => (indexByMessageIdRef.current = map)}
        onNearBottomChange={(near) => (isNearBottomRef.current = near)}
        onAtBottomRead={markAllReadIfAtBottom}
        loadOlder={loadOlder}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        firstItemIndex={firstItemIndex}
        newBelowCount={newBelowCount}
        setNewBelowCount={setNewBelowCount}
        onJumpToMessage={scrollToMessage}
        onReply={(m) => {
          setReplyTarget(m);
          setEditingTarget(null);
        }}
        onEdit={(m) => {
          setEditingTarget(m);
          setReplyTarget(null);
        }}
        onDelete={onDelete}
        toast={toast}
        setToast={setToast}
      />

      <Composer
        roomId={roomId}
        currentUserId={currentUserId}
        currentUsername={currentUsername}
        effectiveUsername={effectiveUsername}
        getMentionUsers={getMentionUsers}
        isSafeDebate={isSafeDebate}
        cooldownMs={COOLDOWN_MS_SAFE_DEBATE}
        notifyTyping={notifyTyping}
        stopTyping={stopTyping}
        onSendOrEdit={sendOrEdit}
        editingTarget={editingTarget}
        replyTarget={replyTarget}
        onClearTargets={clearTargets}
      />
    </div>
  );
});

export default ChatRoomClient;
