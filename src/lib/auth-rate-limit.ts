import "server-only";
import { rateLimit, getClientIp } from "./rate-limit";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_LIMIT = 5;
const AUTH_WINDOW_SECONDS = 60;

// Fallback em memória (por instância) usado só quando o Redis está fora.
// Mantém o brute-force limitado mesmo em degradação, sem travar todos os
// logins (o que aconteceria num fail-closed puro).
const memoryHits = new Map<string, number[]>();

function memoryRateLimitAllowed(key: string): boolean {
  const now = Date.now();
  const windowMs = AUTH_WINDOW_SECONDS * 1000;
  const recent = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  memoryHits.set(key, recent);

  // Limpeza oportunista para não crescer indefinidamente
  if (memoryHits.size > 5000) {
    for (const [k, hits] of memoryHits) {
      if (hits.every((t) => now - t >= windowMs)) memoryHits.delete(k);
    }
  }

  return recent.length <= AUTH_LIMIT;
}

/**
 * Trava estrita de Rate Limit para rotas de Autenticação (Login, Registro,
 * Reset de Senha). Limite: 5 tentativas / 60s por IP.
 *
 * Deve ser chamada no handler de `/api/auth/*` — o proxy do Next NÃO roda em
 * rotas `/api`, então aplicar isso só no middleware seria código morto.
 */
export async function checkAuthRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const key = `auth:limit:${ip}`;

  const rl = await rateLimit(key, AUTH_LIMIT, AUTH_WINDOW_SECONDS);
  // Redis fora → aplica o limiter em memória em vez de liberar (fail-open)
  const allowed = rl.degraded ? memoryRateLimitAllowed(key) : rl.allowed;

  if (!allowed) {
    return NextResponse.json(
      {
        error: "Muitas tentativas de autenticação. Por favor, aguarde 60 segundos antes de tentar novamente.",
        resetInSeconds: rl.resetInSeconds,
      },
      { status: 429 }
    );
  }

  return null;
}
