import "server-only";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/platform-settings";

/**
 * Política de sessão da plataforma:
 *
 *  1. **Timeout de inatividade** — sessão parada por mais de N minutos é
 *     REVOGADA no banco (não só rejeitada), então um cookie roubado depois
 *     disso também não vale nada. N é configurável pelo super admin, com
 *     valores separados para staff (padrão 5 min), cliente final (60 min) e
 *     app mobile (desligado por padrão).
 *
 *  2. **Sessão web única** — ao entrar pelo navegador, as demais sessões WEB
 *     do mesmo usuário são derrubadas. Sessões MOBILE não são afetadas: o app
 *     tem ciclo de vida próprio e seria inutilizável sob a regra do painel.
 *
 * A origem (`session.client`) é gravada na criação da sessão — ver o
 * databaseHook em `@/lib/auth`.
 */

export type SessionClient = "WEB" | "MOBILE";

/** Grava `lastActivityAt` no máximo uma vez por janela, por sessão. */
const ACTIVITY_WRITE_THROTTLE_MS = 30_000;

/** Antecedência do aviso "sua sessão vai expirar" no cliente. */
export const IDLE_WARNING_SECONDS = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Origem da sessão
// ─────────────────────────────────────────────────────────────────────────────

// O app nativo deve enviar `x-client: mobile`. O fallback por User-Agent existe
// para não derrubar builds antigas do app que ainda não mandam o header.
const MOBILE_UA_HINTS = ["okhttp", "expo", "reactnative", "react-native", "dart", "cfnetwork"];

export function detectSessionClient(headers: Headers | null | undefined): SessionClient {
  if (!headers) return "WEB";

  const explicit = headers.get("x-client")?.trim().toLowerCase();
  if (explicit === "mobile") return "MOBILE";
  if (explicit === "web") return "WEB";

  const ua = headers.get("user-agent")?.toLowerCase() ?? "";
  if (ua && MOBILE_UA_HINTS.some((hint) => ua.includes(hint))) return "MOBILE";

  return "WEB";
}

// ─────────────────────────────────────────────────────────────────────────────
// Classificação staff × cliente final
// ─────────────────────────────────────────────────────────────────────────────

// Memo por instância: a classificação é consultada em toda requisição
// autenticada e muda raramente (só ao entrar/sair de uma empresa).
const STAFF_CACHE_TTL_MS = 300_000;
const STAFF_CACHE_MAX = 5_000;
const staffCache = new Map<string, { isStaff: boolean; at: number }>();

export function invalidateStaffCache(userId?: string): void {
  if (userId) staffCache.delete(userId);
  else staffCache.clear();
}

async function isStaffUser(userId: string, role: string | null | undefined): Promise<boolean> {
  if (role === "admin") return true;

  const hit = staffCache.get(userId);
  if (hit && Date.now() - hit.at < STAFF_CACHE_TTL_MS) return hit.isStaff;

  let isStaff = false;
  try {
    const membership = await db.companyUser.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });
    isStaff = Boolean(membership);
  } catch (err) {
    // Banco instável: trata como staff (política mais restritiva) em vez de
    // conceder a janela longa do cliente final por acidente.
    console.error("[session-policy] falha ao classificar usuário:", err);
    isStaff = true;
  }

  if (staffCache.size >= STAFF_CACHE_MAX) staffCache.clear();
  staffCache.set(userId, { isStaff, at: Date.now() });
  return isStaff;
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeout de inatividade
// ─────────────────────────────────────────────────────────────────────────────

/** Minutos de inatividade tolerados para esta sessão. 0 = sem timeout. */
export async function getIdleLimitMinutes(input: {
  userId: string;
  role?: string | null;
  client?: string | null;
}): Promise<number> {
  const settings = await getPlatformSettings();

  if (input.client === "MOBILE") return settings.sessionIdleMobileMinutes;

  const staff = await isStaffUser(input.userId, input.role);
  return staff ? settings.sessionIdleStaffMinutes : settings.sessionIdleCustomerMinutes;
}

export type ActivityCheck = { ok: true } | { ok: false; reason: "IDLE_TIMEOUT" };

/**
 * Verifica a inatividade da sessão e registra o acesso atual.
 * Quando estourou o limite, REVOGA a sessão (delete) e devolve `ok: false` —
 * o chamador redireciona para o login / responde 401.
 */
export async function checkAndTouchSession(input: {
  sessionId: string;
  userId: string;
  role?: string | null;
  client?: string | null;
  lastActivityAt?: Date | string | null;
}): Promise<ActivityCheck> {
  const limitMinutes = await getIdleLimitMinutes(input);
  if (limitMinutes <= 0) return { ok: true };

  const now = Date.now();
  const last = input.lastActivityAt ? new Date(input.lastActivityAt).getTime() : NaN;

  // Sessão sem marca de atividade (criada antes desta feature): trata o acesso
  // atual como o primeiro em vez de deslogar de imediato.
  if (Number.isNaN(last)) {
    await touchSession(input.sessionId);
    return { ok: true };
  }

  const idleMs = now - last;
  if (idleMs > limitMinutes * 60_000) {
    await revokeSession(input.sessionId);
    return { ok: false, reason: "IDLE_TIMEOUT" };
  }

  if (idleMs >= ACTIVITY_WRITE_THROTTLE_MS) {
    await touchSession(input.sessionId);
  }
  return { ok: true };
}

async function touchSession(sessionId: string): Promise<void> {
  try {
    // updateMany: a sessão pode ter sido revogada em paralelo — não queremos
    // que uma corrida vire exceção no meio de uma request legítima.
    await db.session.updateMany({
      where: { id: sessionId },
      data: { lastActivityAt: new Date() },
    });
  } catch (err) {
    console.error("[session-policy] falha ao registrar atividade:", err);
  }
}

export async function revokeSession(sessionId: string): Promise<void> {
  try {
    await db.session.deleteMany({ where: { id: sessionId } });
  } catch (err) {
    console.error("[session-policy] falha ao revogar sessão:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sessão web única
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derruba as outras sessões WEB do usuário, mantendo a recém-criada.
 * Sessões MOBILE ficam intactas de propósito.
 */
export async function enforceSingleWebSession(input: {
  userId: string;
  keepSessionId: string;
}): Promise<number> {
  const settings = await getPlatformSettings();
  if (!settings.singleWebSessionEnabled) return 0;

  try {
    const res = await db.session.deleteMany({
      where: {
        userId: input.userId,
        client: "WEB",
        NOT: { id: input.keepSessionId },
      },
    });
    return res.count;
  } catch (err) {
    console.error("[session-policy] falha ao aplicar sessão única:", err);
    return 0;
  }
}
