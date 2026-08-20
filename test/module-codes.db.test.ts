import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MODULE_CODES } from "@/lib/module-codes";

/**
 * Todo código de módulo usado pelo código tem que existir em `system_module`.
 *
 * ─── O defeito que motivou este arquivo ──────────────────────────────────────
 *
 * `VAULT_MODULE` valia `"cofre_do_cliente"` e não havia linha com esse `code`
 * em `system_module`. Como `company_module_license` amarra empresa e módulo
 * pelo code, nenhuma empresa jamais pôde contratar o cofre de fotos: a tela
 * ficou 404 para todas desde que subiu.
 *
 * E não havia como perceber. Errar a string não lança, não loga, não quebra
 * teste nenhum — dá exatamente o mesmo resultado que "esta empresa não
 * contratou". Um módulo inteiro inalcançável fica indistinguível de um módulo
 * que ninguém comprou.
 *
 * A ponta solta é entre o TypeScript e uma linha de banco, então só um teste
 * que olhe os dois lados fecha.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

let db: typeof import("@/lib/db").db;

d("códigos de módulo (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("todo código em MODULE_CODES tem linha em system_module", async () => {
    const codes = Object.values(MODULE_CODES);
    const rows = await db.systemModule.findMany({
      where: { code: { in: [...codes] } },
      select: { code: true },
    });
    const existentes = new Set(rows.map((r) => r.code));
    const semLinha = codes.filter((c) => !existentes.has(c));

    expect(semLinha, "módulo sem linha em system_module — inalcançável").toEqual([]);
  });

  it("MODULE_CODES não está vazio", () => {
    // Guarda contra o teste acima passar por não ter o que comparar.
    expect(Object.values(MODULE_CODES).length).toBeGreaterThan(5);
  });
});
