// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from "@/auth";

// Important : forcer runtime Node pour éviter Edge ici
export const runtime = "nodejs";
