// app/chat/[roomId]/_components/ChatLayout.tsx
"use client";

import React from "react";
import { styles } from "../_styles/chatStyles";
import { TypingIndicator } from "./TypingIndicator";

type ChatLayoutProps = {
  roomName?: string;
  children: React.ReactNode; // tes messages
  input: React.ReactNode; // ton input existant
  isTyping?: boolean;
  typingText?: string;
};

export function ChatLayout({
  roomName = "Salon",
  children,
  input,
  isTyping = false,
  typingText = "L'assistant rédige…",
}: ChatLayoutProps) {
  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <div style={styles.headerTitle}>TalkTo · Live Chat</div>
            <div style={styles.headerRoom}>{roomName}</div>
          </div>
          <div style={styles.headerPill}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "999px",
                background:
                  "radial-gradient(circle, #22c55e 0, #16a34a 60%, #166534 100%)",
                boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.3)",
              }}
            />
            Session en direct
          </div>
          <div style={styles.headerGlow} />
        </header>

        {/* BODY */}
        <main style={styles.body}>
          <section style={styles.messagesSurface}>
            <div style={styles.messagesScroller}>{children}</div>
          </section>

          <footer style={styles.footer}>
            <div style={styles.footerRow}>
              <div style={{ flex: 1 }}>{input}</div>
            </div>
            <div style={styles.footerHint}>
              <span>Entrée pour envoyer · Shift+Entrée pour une nouvelle ligne</span>
              <TypingIndicator visible={isTyping} text={typingText} />
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
