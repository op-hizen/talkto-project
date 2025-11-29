// app/profile/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProfileView from "./profile-view";

export const runtime = "nodejs";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      username: true,
      role: true,
      accessStatus: true,
      createdAt: true,
      lastUsernameChangeAt: true,
      email: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  // BANNED => redirection comme avant
  if (user.accessStatus === "BANNED") {
    redirect("/banned");
  }

  const isPrivileged =
    user.role === "ADMIN" || user.role === "DEV";

  let canChangeUsername = true;
  let cooldownMessage: string | null = null;

  if (!isPrivileged && user.username && user.lastUsernameChangeAt) {
    const lastChange = user.lastUsernameChangeAt.getTime();
    const now = Date.now();
    const diffMs = now - lastChange;
    const hours = diffMs / (1000 * 60 * 60);

    if (hours < 24) {
      canChangeUsername = false;
      const remaining = Math.ceil(24 - hours);
      cooldownMessage = `Tu pourras rechanger de pseudo dans environ ${remaining} heure(s).`;
    }
  }

  return (
    <ProfileView
      user={{
        username: user.username,
        role: user.role,
        accessStatus: user.accessStatus,
        createdAt: user.createdAt.toISOString(),
        email: user.email ?? "",
      }}
      canChangeUsername={canChangeUsername}
      cooldownMessage={cooldownMessage}
    />
  );
}
