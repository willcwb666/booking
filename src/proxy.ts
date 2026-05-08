import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Rotas completamente públicas (sem auth)
const FULLY_PUBLIC = ["/", "/book", "/empresas"];
// Rotas de autenticação (redireciona para fora se já logado)
const AUTH_ROUTES = ["/login", "/register"];
// Rotas que exigem role "admin" do better-auth
const ADMIN_ROUTES = ["/admin"];

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Deixa passar rotas totalmente públicas
  if (FULLY_PUBLIC.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return withSecurityHeaders(NextResponse.next());
  }

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  const session = await auth.api.getSession({ headers: request.headers });

  // Auth routes: redireciona para onboarding se já está logado
  if (isAuthRoute) {
    if (session) return NextResponse.redirect(new URL("/onboarding", request.url));
    return withSecurityHeaders(NextResponse.next());
  }

  // Tudo mais requer autenticação
  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Rotas admin: verifica role global do better-auth
  if (isAdminRoute && session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
