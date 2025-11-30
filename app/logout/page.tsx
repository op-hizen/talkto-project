// app/logout/page.tsx
"use client";

import { signOut } from "next-auth/react";

export default function LogoutPage() {
  const handleLogout = () => {
    void signOut({ callbackUrl: "/login" });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
        <h1 className="text-2xl font-semibold mb-4 text-center">TalkTo</h1>
        <p className="mb-6 text-sm text-center text-white/70">
          Vous êtes sur le point de vous déconnecter.
        </p>

        <button
          onClick={handleLogout}
          className="w-full py-2 px-4 rounded-lg border border-white/20 hover:border-white/40 transition"
        >
          Se déconnecter
        </button>

        <p className="mt-4 text-xs text-center text-white/50">
          Vous serez renvoyé vers la page de connexion.
        </p>
      </div>
    </main>
  );
}
