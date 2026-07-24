import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Rotas completamente públicas (sem auth)
const FULLY_PUBLIC = ["/", "/book", "/empresas"];
// Rotas de autenticação (redireciona para fora se já logado)
const AUTH_ROUTES = ["/login", "/register"];
// Rotas que exigem role "admin" do better-auth
const ADMIN_ROUTES = ["/admin"];
// Segmentos raiz reservados — nunca tratados como slug público de empresa
const RESERVED_SEGMENTS = new Set([
  "dashboard",
  "onboarding",
  "admin",
  "login",
  "register",
  "empresas",
  "book",
  "orcamentos",
  "selecionar-empresa",
]);

// `/{slug}` (um único segmento, não reservado) é a página pública da empresa
function isTenantLandingPage(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 1 && !RESERVED_SEGMENTS.has(segments[0]);
}

// Security headers (CSP, X-Frame-Options etc.) são aplicados globalmente
// via headers() no next.config.ts — cobrem também /api e redirects.

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Deixa passar rotas totalmente públicas
  if (FULLY_PUBLIC.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  // Página pública da empresa (/{slug})
  if (isTenantLandingPage(pathname)) {
    return NextResponse.next();
  }

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  const session = await auth.api.getSession({ headers: request.headers });

  // Auth routes: se já está logado, manda ao roteador pós-login (/dashboard),
  // que decide o destino (admin → /admin, sem empresa → onboarding,
  // 1 empresa → dashboard dela, 2+ → seletor de ambiente)
  if (isAuthRoute) {
    if (session) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  // Tudo mais requer autenticação
  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Rotas admin: verifica role global do better-auth. Não-admin vai ao
  // roteador pós-login (não ao onboarding), que decide o destino correto.
  if (isAdminRoute && session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
