// next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import type { Role, AccessStatus } from "@prisma/client";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      accessStatus: AccessStatus;
      username: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    accessStatus: AccessStatus;
    username: string | null;
  }
}
