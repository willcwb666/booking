import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Nenhum caminho de requisição pode alterar o formato do banco.
 *
 * ─── O que esta varredura encontrou ──────────────────────────────────────────
 *
 * Dezoito comandos de DDL espalhados por doze arquivos, rodando A CADA
 * requisição: `CREATE TABLE IF NOT EXISTS` antes de ler, `ALTER TABLE ... ADD
 * COLUMN IF NOT EXISTS` antes de gravar. Quatro consequências, em ordem de
 * gravidade:
 *
 * 1. Duas tabelas — `company_payment_gateway` e `company_landing_config` —
 *    existiam SÓ assim. Não estavam no schema, não tinham migration, não
 *    tinham chave estrangeira, e eram invisíveis para a análise de drift,
 *    porque não há o que comparar com o que não está no schema. Quem criava a
 *    de pagamento era o primeiro visitante ANÔNIMO a abrir um checkout.
 *
 * 2. Duas colunas de `professional` — `documentNumber` e `instagram` — nasciam
 *    do `ALTER TABLE` disparado pelo cadastro. A primeira criação de
 *    profissional em produção alterava a tabela e deixava duas colunas que o
 *    Prisma não conhece: drift permanente, que o `migrate diff` leria como
 *    colunas a DERRUBAR.
 *
 * 3. DDL pega lock de tabela. Fazer isso no caminho de leitura de uma página
 *    pública é pedir contenção sob carga para não fazer nada — a tabela já
 *    existe da segunda requisição em diante.
 *
 * 4. Todos vinham embrulhados em `catch {}` mudo, então falha de permissão no
 *    banco não aparecia em lugar nenhum.
 *
 * A tabela nasce em `prisma/migrations`. Sempre.
 */

const ROOT = path.join(process.cwd(), "src");

/** DDL que muda o formato do banco. `CREATE INDEX CONCURRENTLY` não entra. */
const DDL = /\b(CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|DROP\s+COLUMN)\b/i;

/**
 * Comentários fora antes de procurar.
 *
 * As notas deste projeto explicam o defeito CITANDO o comando removido. Sem
 * remover, este teste acusaria justamente os arquivos já corrigidos.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // `generated` é saída do Prisma: o DDL de lá é dele, não nosso.
    if (entry.isDirectory()) {
      if (entry.name === "generated") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("nenhum DDL em tempo de execução", () => {
  const files = walk(ROOT);

  it("encontra os arquivos do projeto", () => {
    // Se a varredura quebrar, o teste abaixo passaria vazio — o pior resultado
    // possível para uma guarda.
    expect(files.length).toBeGreaterThan(200);
  });

  it("nenhum arquivo de src/ executa CREATE/ALTER/DROP TABLE", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = stripComments(fs.readFileSync(file, "utf8"));
      if (!DDL.test(src)) continue;

      const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
      for (const [i, line] of src.split("\n").entries()) {
        if (DDL.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 70)}`);
      }
    }

    expect(
      offenders,
      "DDL em caminho de requisição. A tabela nasce em `prisma/migrations`:\n" +
        "crie a migration, adicione o model ao schema e apague o comando daqui."
    ).toEqual([]);
  });
});
