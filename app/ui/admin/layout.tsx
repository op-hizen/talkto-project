// app/ui/admin/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_ROLES = ["ADMIN", "DEV", "MODERATOR", "SUPPORT"] as const;

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      username: true,
      email: true,
      role: true,
      accessStatus: true,
    },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // 👉 Si banni, même admin → page /banned
  if (dbUser.accessStatus === "BANNED") {
    redirect("/banned");
  }

  const isAdmin = ADMIN_ROLES.includes(
    dbUser.role as (typeof ADMIN_ROLES)[number]
  );

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="max-w-5xl mx-auto py-10 px-4 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Panel Admin</h1>
          <p className="text-xs text-white/60">
            Connecté(e) en tant que{" "}
            <span className="font-semibold">
              {dbUser.username ?? dbUser.email}
            </span>{" "}
            – Rôle : <span className="font-mono">{dbUser.role}</span>
          </p>
        </header>
        {children}
      </main>
    </div>
  );
}
