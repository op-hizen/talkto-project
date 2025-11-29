// app/ui/admin/user/[id]/unban/page.tsx
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { pusher } from "@/lib/pusher";

export const runtime = "nodejs";

export default async function UnbanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: userId } = await params;

  const lastBan = await prisma.ban.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const newStatus = lastBan?.previousAccessStatus ?? "MEMBER";

  await prisma.user.update({
    where: { id: userId },
    data: { accessStatus: newStatus },
  });

  // 🔥 Event temps réel vers le client
  await pusher.trigger(`user-${userId}`, "unban", {});

  redirect(`/ui/admin/user/${userId}`);
}
