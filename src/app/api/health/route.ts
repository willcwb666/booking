import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * Verificação de saúde para o balanceador e o monitoramento externo.
 *
 * Responde 200 só quando o Postgres responde — sem banco a aplicação não faz
 * nada de útil e precisa sair da rotação. O Redis é reportado mas NÃO derruba
 * o status: com ele fora, os rate limits caem no limitador em memória e a
 * aplicação continua atendendo, então tirar a instância do ar pioraria.
 *
 * Não expõe versão, host nem detalhe de erro: é um endpoint público.
 */
const TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
    ),
  ]);
}

async function checkDatabase(): Promise<{ ok: boolean; ms: number }> {
  const started = Date.now();
  try {
    await withTimeout(db.$queryRaw`SELECT 1`);
    return { ok: true, ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  }
}

async function checkRedis(): Promise<{ ok: boolean; ms: number }> {
  const started = Date.now();
  try {
    await withTimeout(redis.ping());
    return { ok: true, ms: Date.now() - started };
  } catch {
    return { ok: false, ms: Date.now() - started };
  }
}

export async function GET() {
  const [database, cache] = await Promise.all([checkDatabase(), checkRedis()]);

  const healthy = database.ok;
  const status = healthy ? (cache.ok ? "ok" : "degraded") : "down";

  return NextResponse.json(
    {
      status,
      checks: { database, cache },
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
