// components/realtime-ban-listener.tsx
"use client";

import { useEffect } from "react";
import Pusher from "pusher-js";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RealtimeBanListener() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      console.warn("Pusher env vars manquantes côté client.");
      return;
    }

    const pusher = new Pusher(key, { cluster });
    const channelName = `user-${session.user.id}`;
    const channel = pusher.subscribe(channelName);

    channel.bind("ban", () => {
      router.replace("/banned");
    });

    channel.bind("unban", () => {
      router.replace("/dashboard");
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [status, session?.user?.id, router]);

  return null;
}
