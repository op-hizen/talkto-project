// auth.ts
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role, AccessStatus } from "@prisma/client";

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
      // Au premier login, `user` est défini → on copie les infos
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
