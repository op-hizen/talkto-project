// app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  const handleLogin = () => {
    void signIn("google");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="p-8 rounded-2xl border border-white/10 bg-white/5">
        <h1 className="text-2xl font-semibold mb-4 text-center">TalkTo</h1>
        <p className="mb-6 text-sm text-center text-white/70">
          Connexion requise pour accéder à la plateforme.
        </p>
        <button
          onClick={handleLogin}
          className="w-full py-2 px-4 rounded-lg border border-white/20 hover:border-white/40 transition"
        >
          Se connecter avec Google
        </button>
      </div>
    </main>
  );
}
