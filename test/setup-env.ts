import { readFileSync, existsSync } from "node:fs";

/**
 * O Vitest não carrega `.env` (isso é feito pelo Next). Os testes unitários não
 * precisam, mas os de integração (`RUN_DB_TESTS=1`) sim — e `@/lib/db` cria o
 * pool já no import, então isto precisa rodar ANTES de qualquer módulo de teste.
 * Daí ser um `setupFile` e não um import no topo do arquivo de teste (imports
 * ESM são içados).
 */
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    // Não sobrescreve o que já veio do ambiente real
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}
