// lib/username.ts

const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "moderator",
  "modo",
  "support",
  "staff",
  "talkto",
  "owner",
  "root",
  "dev",
  "system",
];

type ValidateOptions = {
  isPrivileged?: boolean; // ADMIN / DEV etc.
};

export function validateUsername(
  raw: string,
  opts: ValidateOptions = {}
): string | null {
  const value = raw.trim();

  if (!value) {
    return "Le pseudo est obligatoire.";
  }

  // Longueur : min 3 pour tout le monde, sauf ADMIN/DEV → min 1
  const minLen = opts.isPrivileged ? 1 : 3;
  const maxLen = 20;

  if (value.length < minLen || value.length > maxLen) {
    if (opts.isPrivileged) {
      return `Le pseudo doit faire entre ${minLen} et ${maxLen} caractères.`;
    }
    return `Le pseudo doit faire entre 3 et 20 caractères.`;
  }

  // Uniquement lettres / chiffres / underscore
  const safePattern = /^[a-zA-Z0-9_]+$/;
  if (!safePattern.test(value)) {
    return "Le pseudo ne peut contenir que des lettres, chiffres et « _ » (pas d'espaces, pas d'émojis, pas de tirets).";
  }

  // On bloque quelques noms réservés
  const lower = value.toLowerCase();
  if (RESERVED_USERNAMES.includes(lower)) {
    return "Ce pseudo est réservé.";
  }

  // Ici tu peux rajouter une liste de mots vulgaires si tu veux
  // ex: if (BANNED_WORDS.some((w) => lower.includes(w))) { ... }

  return null;
}
