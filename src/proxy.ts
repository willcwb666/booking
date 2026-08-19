import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { checkAndTouchSession } from "@/lib/session-policy";

// Rotas completamente públicas (sem auth)
const FULLY_PUBLIC = ["/", "/book", "/empresas"];
// Rotas de autenticação (redireciona para fora se já logado)
const AUTH_ROUTES = ["/login", "/register"];
// Recuperação de senha: pública e SEM redirecionar quem já está logado —
// quem clica no link do e-mail com uma sessão viva ainda precisa trocar a senha.
const PASSWORD_ROUTES = ["/recuperar-senha", "/redefinir-senha"];
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
  "recuperar-senha",
  "redefinir-senha",
]);

// `/{slug}` (um único segmento, não reservado) é a página pública da empresa
function isTenantLandingPage(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 1 && !RESERVED_SEGMENTS.has(segments[0]);
}

// Security headers (CSP, X-Frame-Options etc.) são aplicados globalmente
// via headers() no next.config.ts — cobrem também /api e redirects.

// Nomes possíveis do cookie de sessão do better-auth (o prefixo `__Secure-`
// entra quando `useSecureCookies` está ligado, em produção).
const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_data",
];

/** Manda ao login sinalizando o motivo e limpa o cookie da sessão revogada. */
function redirectToLogin(request: NextRequest, pathname: string, reason?: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("callbackUrl", pathname);
  if (reason) url.searchParams.set("reason", reason);

  const response = NextResponse.redirect(url);
  if (reason) {
    for (const name of SESSION_COOKIE_NAMES) {
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Deixa passar rotas totalmente públicas
  if (FULLY_PUBLIC.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  if (PASSWORD_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Página pública da empresa (/{slug})
  if (isTenantLandingPage(pathname)) {
    return NextResponse.next();
  }

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));

  // O rate limit de brute-force é aplicado no handler /api/auth (route.ts),
  // pois este matcher exclui /api — verificar aqui seria código morto.

  const session = await auth.api.getSession({ headers: request.headers });

  // Auth routes: se já está logado, manda ao roteador pós-login (/dashboard),
  if (isAuthRoute) {
    if (session) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  // Tudo mais requer autenticação
  if (!session) {
    return redirectToLogin(request, pathname);
  }

  // Timeout de inatividade: revoga a sessão parada há mais tempo que o limite
  // configurado pelo super admin e registra o acesso atual. Roda aqui porque o
  // proxy cobre toda navegação de painel numa única checagem.
  const activity = await checkAndTouchSession({
    sessionId: session.session.id,
    userId: session.user.id,
    role: session.user.role,
    client: (session.session as { client?: string }).client,
    lastActivityAt: (session.session as { lastActivityAt?: Date }).lastActivityAt,
  });
  if (!activity.ok) {
    return redirectToLogin(request, pathname, "idle");
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
