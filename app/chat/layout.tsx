// app/chat/layout.tsx
import { ReactNode } from "react";
import ChatTabs from "./ChatTabs";

export const runtime = "nodejs";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-slate-100 flex flex-col bg-[#020617]">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_10%_-10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(800px_420px_at_90%_-20%,rgba(14,165,233,0.12),transparent_60%),radial-gradient(900px_520px_at_50%_110%,rgba(168,85,247,0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.65),rgba(2,6,23,0.95))]" />
        <div className="absolute inset-0 opacity-[0.06] mix-blend-soft-light bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/15 ring-1 ring-indigo-400/30 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-indigo-300 shadow-[0_0_18px_rgba(129,140,248,0.9)]" />
            </div>
            <div className="leading-tight">
              <div className="text-[12px] font-semibold tracking-[0.22em] uppercase text-slate-200">
                TalkTo
              </div>
              <div className="text-[10px] text-slate-500">
                chat temps réel
              </div>
            </div>
          </div>

          {/* Tabs centered */}
          <div className="flex-1 flex justify-center">
            <ChatTabs />
          </div>

          {/* Right slot (future search / profile) */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-[10px] text-slate-500 px-2 py-1 rounded-full border border-white/10 bg-white/[0.03]">
              ⌘K Rechercher
            </div>
          </div>
        </div>
      </header>

      {/* Main takes remaining height */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
