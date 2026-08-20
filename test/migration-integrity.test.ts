import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

/**
 * O histórico de migrations descreve o schema inteiro?
 *
 * ─── Por que este arquivo existe ─────────────────────────────────────────────
 *
 * Em 2026-08-20 descobriu-se que `prisma migrate deploy` contra um banco vazio
 * não funcionava. A cadeia quebrava na migration 29:
 *
 *     ERROR: relation "customer" does not exist   (42P01)
 *
 * Dez tabelas do schema — `customer` entre elas — nunca tinham sido criadas por
 * migration nenhuma, e dezenas de colunas estavam no mesmo estado. Todas
 * existiam no banco de desenvolvimento, criadas por `prisma db push` ou por
 * `CREATE TABLE IF NOT EXISTS` no código de aplicação.
 *
 * É um defeito que o desenvolvimento esconde por construção: a máquina de quem
 * programa já tem as tabelas. Só aparece no primeiro deploy limpo — em
 * produção, ou no dia em que alguém precisa recriar o ambiente.
 *
 * ─── O que este teste NÃO faz ────────────────────────────────────────────────
 *
 * Não substitui o replay de verdade. A prova completa é reaplicar a cadeia num
 * banco vazio e comparar com o schema:
 *
 *   prisma migrate diff --from-migrations prisma/migrations \
 *                       --to-schema prisma/schema.prisma --script
 *
 * (exige `SHADOW_DATABASE_URL`). Isso precisa de banco, então mora no CI.
 * Aqui fica a checagem barata que roda em toda execução de teste e pega o caso
 * mais comum: model novo que entrou no schema sem migration junto.
 */

const ROOT = path.resolve(__dirname, "..");
const MIGRATIONS = path.join(ROOT, "prisma", "migrations");

function readSchema(): string {
  return fs.readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8");
}

function readAllMigrationSql(): string {
  return fs
    .readdirSync(MIGRATIONS)
    .filter((d) => fs.existsSync(path.join(MIGRATIONS, d, "migration.sql")))
    .sort()
    .map((d) => fs.readFileSync(path.join(MIGRATIONS, d, "migration.sql"), "utf8"))
    .join("\n");
}

describe("integridade do histórico de migrations", () => {
  it("toda tabela do schema é criada por alguma migration", () => {
    const schema = readSchema();
    const sql = readAllMigrationSql();

    const mapped = [...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(mapped.length).toBeGreaterThan(50);

    const created = new Set(
      [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"([^"]+)"/gi)].map(
        (m) => m[1]
      )
    );

    const missing = mapped.filter((t) => !created.has(t));

    expect(
      missing,
      "Model no schema.prisma sem migration que crie a tabela.\n" +
        "O banco de desenvolvimento esconde isso — o deploy limpo não.\n" +
        "Gere a migration com `prisma migrate dev`, nunca com `prisma db push`."
    ).toEqual([]);
  });

  it("nenhuma migration apaga coluna sem dizer por quê", () => {
    /**
     * `DROP COLUMN` destrói dado de produção. Isso não é proibido — às vezes é
     * exatamente o que se quer —, mas tem de ser deliberado.
     *
     * O caso que motivou a regra: o `migrate diff` expressou a troca de um enum
     * por texto como DROP + ADD. Num banco vazio é inofensivo; num banco com
     * dados, apagaria o ramo de todas as empresas. Passou perto de ser
     * aplicado. Exigir um comentário força quem escreve a olhar.
     */
    const dirs = fs
      .readdirSync(MIGRATIONS)
      .filter((d) => fs.existsSync(path.join(MIGRATIONS, d, "migration.sql")));

    const undocumented: string[] = [];
    for (const d of dirs) {
      const sql = fs.readFileSync(path.join(MIGRATIONS, d, "migration.sql"), "utf8");
      const lines = sql.split("\n");
      lines.forEach((line, i) => {
        if (!/^\s*(ALTER TABLE.*)?DROP COLUMN/i.test(line)) return;
        // Um comentário em qualquer ponto do arquivo já indica intenção anotada.
        const hasReason = /^\s*--/m.test(sql);
        if (!hasReason) undocumented.push(`${d}:${i + 1}`);
      });
    }

    expect(
      undocumented,
      "DROP COLUMN sem nenhum comentário na migration. Apagar coluna descarta " +
        "dado de produção — escreva por que, para o próximo leitor poder discordar."
    ).toEqual([]);
  });

  it("o nome de cada pasta de migration é ordenável e único", () => {
    // A ordem de aplicação é lexicográfica pelo nome da pasta. Um carimbo fora
    // do padrão aplicaria a migration na hora errada — foi assim que a cadeia
    // quebrou: uma ALTER TABLE rodava antes da CREATE TABLE correspondente.
    const dirs = fs
      .readdirSync(MIGRATIONS)
      .filter((d) => fs.existsSync(path.join(MIGRATIONS, d, "migration.sql")));

    const bad = dirs.filter((d) => !/^\d{14}_[a-z0-9_]+$/.test(d));
    expect(bad, "Pasta de migration fora do padrão <14 dígitos>_<nome>").toEqual([]);

    const stamps = dirs.map((d) => d.slice(0, 14));
    expect(new Set(stamps).size, "Duas migrations com o mesmo carimbo de hora").toBe(
      stamps.length
    );
  });
});
