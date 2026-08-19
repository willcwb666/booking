import "server-only";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RATE_LIMITS, enforceRateLimit, getClientIp } from "./rate-limit";

/**
 * Trava de brute-force nas rotas de autenticação (login, cadastro, reset de
 * senha): 5 tentativas por minuto por IP.
 *
 * Deve ser chamada no handler de `/api/auth/*` — o proxy do Next NÃO roda em
 * rotas `/api`, então aplicar isso só no middleware seria código morto.
 *
 * Com o Redis fora, a política `AUTH` cai no limitador em memória (por
 * instância) em vez de liberar: degrada a precisão, nunca a proteção.
 */
export async function checkAuthRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const result = await enforceRateLimit(RATE_LIMITS.AUTH, ip);

  if (result.allowed) return null;

  return NextResponse.json(
    { error: result.message, resetInSeconds: result.resetInSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.resetInSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
