// auth.ts
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role, AccessStatus } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

/* ---------------- Types internes NextAuth ---------------- */

type AppJWT = JWT & {
  id?: string;
  role?: Role;
  accessStatus?: AccessStatus;
  username?: string | null;
};

type AppUserLike = {
  id?: string;
  role?: Role;
  accessStatus?: AccessStatus;
  username?: string | null;
};

/* ---------------- NextAuth ---------------- */

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      const t = token as AppJWT;

      if (user) {
        const u = user as AppUserLike;

        // ✅ on force id en string parce qu'avec PrismaAdapter il existe toujours
        if (u.id) t.id = u.id;

        if (u.role) t.role = u.role;
        if (u.accessStatus) t.accessStatus = u.accessStatus;
        if (u.username !== undefined) t.username = u.username;
      }

      return t;
    },

    async session({ session, token }) {
      const t = token as AppJWT;

      if (session.user) {
        // ✅ en session le user.id doit être string -> fallback safe
        session.user.id = t.id ?? "";

        session.user.role = (t.role ?? "USER") as Role;
        session.user.accessStatus = (t.accessStatus ?? "ACTIVE") as AccessStatus;
        session.user.username = (t.username ?? null) as string | null;
      }

      return session;
    },
  },
});

/**
 * Route Handlers helper
 * - Compatible App Router: requireUserId(req)
 * - Utilise `auth()` NextAuth v5 (lit cookies/headers automatiquement)
 */
export async function requireUserId(_req?: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("unauthorized");
  }
  return userId;
}

/**
 * Si tu veux parfois toute la session côté route handlers
 */
export async function requireSession(_req?: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthorized");
  return session;
}
