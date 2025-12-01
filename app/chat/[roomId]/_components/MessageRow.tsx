// app/chat/[roomId]/_components/MessageRow.tsx
"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import type { Message } from "../chatTypes";

/* ---------------- MOTION VARIANTS ---------------- */

const actionsVariants = {
  hidden: { opacity: 0, y: 2 },
  show: { opacity: 1, y: 0, transition: { duration: 0.12 } },
};

/* ---------------- HELPERS ---------------- */

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------------- TYPES ---------------- */

export type MsgItem = {
  type: "msg";
  key: string;
  msg: Message;
  index: number;
  groupedWithPrev: boolean;
  groupIndex: number;
  groupSize: number;
};

type Props = {
  it: MsgItem;
  currentUserId: string;
  effectiveUsername: string;
  highlightedId: string | null;
  selectedMessageId: string | null;

  onSelect: (id: string | null) => void;
  onUserClick?: (id: string) => void;

  onJumpToMessage: (id: string) => void;

  onReply: (m: Message) => void;
  onEdit: (m: Message) => void;
  onDelete: (id: string) => void;

  renderContentWithMentions: (id: string, text: string) => React.ReactNode;
};

const MessageRow = React.memo(function MessageRow({
  it,
  currentUserId,
  effectiveUsername,
  highlightedId,
  selectedMessageId,
  onSelect,
  onUserClick,
  onJumpToMessage,
  onReply,
  onEdit,
  onDelete,
  renderContentWithMentions,
}: Props) {
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
    m.content.toLowerCase().includes(`@${effectiveUsername.toLowerCase()}`);

  const isMentioned = !isDeleted && (mentionedByName || repliedToMe);
  const displayContent = isDeleted ? "Message supprimé" : m.content;

  const authorLabel = m.author.username ?? "Utilisateur";
  const isSelected = selectedMessageId === m.id;

  const showAvatar = !groupedWithPrev;
  const showStack = showAvatar && groupSize >= 3;

  const badgeClass = useMemo(() => {
    if (!showBadge) return "";
    if (m.author.role === "ADMIN" || m.author.role === "DEV") {
      return "border-fuchsia-400/70 bg-fuchsia-500/10 text-fuchsia-200";
    }
    if (m.author.role === "MODERATOR" || m.author.role === "SUPPORT") {
      return "border-cyan-400/70 bg-cyan-500/10 text-cyan-200";
    }
    return "border-white/20 bg-white/5 text-slate-300";
  }, [showBadge, m.author.role]);

  return (
    <div
      data-msg-root="true"
      onClick={() => onSelect(isSelected ? null : m.id)}
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
              onJumpToMessage(m.replyTo!.id);
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
                  className={`px-1 py-0.5 rounded-full text-[9px] border uppercase tracking-wide leading-none ${badgeClass}`}
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
                  onClick={() => onReply(m)}
                  className="hover:underline underline-offset-2"
                >
                  Répondre
                </button>

                {isMe && !isDeleted && (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit(m)}
                      className="hover:underline underline-offset-2"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(m.id)}
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
});

export default MessageRow;
