// app/chat/[roomId]/_components/TypingIndicator.tsx
"use client";

import React from "react";

type TypingIndicatorProps = {
  text?: string;
  visible?: boolean;
  compact?: boolean;
};

export function TypingIndicator({
  text = "L’assistant écrit…",
  visible = false,
  compact = false,
}: TypingIndicatorProps) {
  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      className={[
        "inline-flex items-center gap-2",
        "rounded-full border border-white/10 bg-black/60 backdrop-blur-xl",
        compact ? "px-2 py-1" : "px-3 py-1.5",
      ].join(" ")}
    >
      {/* dots */}
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" />
      </div>

      {/* text */}
      <div className={compact ? "text-[10px] text-slate-400" : "text-[11px] text-slate-400"}>
        {text}
      </div>
    </div>
  );
}
