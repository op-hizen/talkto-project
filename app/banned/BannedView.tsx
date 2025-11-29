"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Clock3,
  Ban,
  HelpCircle,
  Radar,
  Sparkles,
} from "lucide-react";

type Props = {
  userId: string;
  banReason: string;
  moderatorId: string; // ID du modérateur (figé)
  banCreatedAt: string;
  banExpiresAt: string;
  isPermanent: boolean;
  actionId: string;
};

export default function BannedView({
  userId,
  banReason,
  moderatorId,
  banCreatedAt,
  banExpiresAt,
  isPermanent,
  actionId,
}: Props) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050507] text-slate-100">
      {/* Background FX */}
      <BackgroundFX />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-6 py-14">
        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          {/* MAIN CARD */}
          <motion.section
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_25px_120px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            {/* HEADER STRIP */}
            <div className="relative overflow-hidden rounded-3xl border-b border-white/10 bg-gradient-to-br from-red-950/40 via-zinc-950 to-black px-7 py-7 sm:px-10">
              <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-red-600/20 blur-3xl" />
              <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30">
                  <ShieldAlert className="h-6 w-6 text-red-200" />
                </div>

                <div className="flex-1">
                  <p className="text-[11px] tracking-[0.25em] uppercase text-red-200/80">
                    Code 403
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Banni(e).
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">
                    Pour protéger la communauté, ton compte a été suspendu après
                    une infraction aux règles de la plateforme.
                  </p>
                </div>
              </div>
            </div>

            {/* CONTENT */}
            <div className="px-7 py-7 sm:px-10 sm:py-9">
              {/* NOTICE */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.45 }}
                className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5"
              >
                <div className="flex items-center gap-3">
                  <Ban className="h-5 w-5 text-red-200" />
                  <p className="text-sm font-semibold text-red-100">
                    Toute tentative de contournement peut entraîner une
                    interdiction définitive.
                  </p>
                </div>
              </motion.div>

              {/* REASON */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.45 }}
                className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
              >
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Motif enregistré
                </p>
                <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed">
                  {banReason}
                </p>
              </motion.div>

              {/* TIMELINE */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.45 }}
                className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <TimelineCard
                  icon={<Clock3 className="h-5 w-5 text-slate-200" />}
                  title="Début de suspension"
                  value={banCreatedAt}
                />
                <TimelineCard
                  icon={<Radar className="h-5 w-5 text-slate-200" />}
                  title={isPermanent ? "Durée" : "Fin estimée"}
                  value={isPermanent ? "Permanente" : banExpiresAt}
                  highlight={isPermanent}
                />
              </motion.div>

              {/* ACTIONS */}
              <motion.footer
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.42, duration: 0.5 }}
                className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center"
              >
                <p className="text-xs leading-relaxed text-slate-400 sm:max-w-xl">
                  Si tu penses qu’il s’agit d’une erreur, contacte le support.
                  Les messages agressifs seront ignorés et peuvent durcir la
                  sanction.
                </p>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                  <Link
                    href="/support"
                    className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold transition hover:border-white/20 hover:bg-white/[0.07]"
                  >
                    <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                      <span className="absolute -left-10 top-0 h-full w-20 skew-x-[-20deg] bg-white/10 blur-md animate-[shine_1.2s_ease-in-out]" />
                    </span>
                    <HelpCircle className="h-4 w-4" />
                    Contacter le support
                  </Link>

                  <Link
                    href="/"
                    prefetch={false}
                    className="inline-flex items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/15"
                  >
                    Quitter
                  </Link>
                </div>
              </motion.footer>
            </div>
          </motion.section>

          {/* SIDE PANEL */}
          <motion.aside
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-7"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <Sparkles className="h-5 w-5 text-slate-100/90" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Informations de suspension
                </h2>
                <p className="text-xs text-slate-400">
                  Références internes et traçabilité.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <MiniStat label="ID utilisateur" value={userId} />
              <MiniStat label="ID modérateur" value={moderatorId} />
              <MiniStat label="ID action" value={actionId} />
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-slate-300">
                Statut :
                <span className="ml-2 inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-100 ring-1 ring-red-500/30">
                  Suspendu{isPermanent ? " (permanent)" : ""}
                </span>
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                La levée automatique se fait dès que la date de fin est
                atteinte. Aucune action manuelle n’est nécessaire.
              </p>
            </div>

            <Divider />

            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500/60" />
                Prends connaissance de la règle violée avant de faire appel.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500/60" />
                La récidive durcit les sanctions et peut mener à un ban
                définitif.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500/60" />
                Les logs sont conservés pour audit et suivi interne.
              </li>
            </ul>
          </motion.aside>
        </div>
      </div>

      <footer className="relative z-10 pb-8 text-center text-[10px] tracking-[0.3em] uppercase text-slate-600">
        TalkTo • Trust &amp; Safety
      </footer>

      {/* Keyframes globales */}
      <style jsx global>{`
        @keyframes shine {
          0% {
            transform: translateX(-120%) skewX(-20deg);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          100% {
            transform: translateX(420%) skewX(-20deg);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  );
}

/* ---------- UI Bits ---------- */

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-xs text-slate-100">
        {value}
      </p>
    </div>
  );
}

function TimelineCard({
  icon,
  title,
  value,
  highlight,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            {title}
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              highlight ? "text-red-100" : "text-slate-100"
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-6 h-px w-full bg-white/10" />;
}

/* Background sans AnimatePresence => plus aucune erreur de key */
function BackgroundFX() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      {/* animated blobs */}
      <motion.div
        className="absolute left-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-red-600/20 blur-3xl"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 0, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-15%] bottom-[-25%] h-[620px] w-[620px] rounded-full bg-fuchsia-600/10 blur-3xl"
        animate={{ x: [0, -50, 10, 0], y: [0, -30, 0, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_center,transparent_35%,rgba(0,0,0,0.9)_70%)]" />
    </div>
  );
}
