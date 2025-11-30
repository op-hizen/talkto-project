// lib/pusher/client.ts
"use client";

import PusherClient from "pusher-js";

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    authEndpoint: "/api/pusher/auth",
    // ✅ pas de withCredentials : cookies same-origin envoyés par défaut
  }
);
