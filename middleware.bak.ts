// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  const isAuthRoute =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/u/username");

  const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isStatic =
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname.startsWith("/favicon.ico");

  // On ignore les assets/statics
  if (isStatic) {
    return NextResponse.next();
  }

  // Récupération du JWT NextAuth
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  // Pas connecté
  if (!token) {
    // On laisse passer:
    // - les routes d'auth UI (/login, /u/username)
    // - l'API d'auth (/api/auth)
    if (isAuthRoute || isApiAuth) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Connecté → on récupère le username du token
  const username = (token as any).username as string | null;

  // Si pas de pseudo :
  // - on force la redirection vers /u/username
  // - MAIS on laisse passer toutes les routes /api/* (dont /api/username)
  if (
    !username &&
    !nextUrl.pathname.startsWith("/u/username") &&
    !isApiAuth &&
    !isApiRoute
  ) {
    return NextResponse.redirect(new URL("/u/username", nextUrl));
  }

  // Tout est OK → on laisse passer
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
