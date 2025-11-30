// app/chat/[roomId]/_hooks/useTypingText.ts
"use client";

type TypingUser = { userId: string; username: string | null };

export function useTypingText(users: TypingUser[]): string {
  if (!users.length) return "";

  if (users.length === 1) {
    return `${users[0].username ?? "Quelqu'un"} est en train d'écrire...`;
  }

  if (users.length === 2) {
    const [a, b] = users;
    return `${a.username ?? "Quelqu'un"} et ${
      b.username ?? "un autre utilisateur"
    } écrivent...`;
  }

  return "Plusieurs personnes sont en train d'écrire...";
}
