// auth.ts
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role, AccessStatus } from "@prisma/client";
import type { NextRequest } from "next/server";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessStatus = user.accessStatus;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.accessStatus = token.accessStatus as AccessStatus;
        session.user.username = (token.username as string) ?? null;
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
  const session = await auth(); // auth() marche en route handler sans passer req
  const userId = session?.user?.id;
  if (!userId) {
    // important: throw pour être catch par tes handlers
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
