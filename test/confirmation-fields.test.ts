import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

/**
 * A tela de confirmação lia campos que não existem.
 *
 * `src/app/obrigado/page.tsx` era `let booking: any`, e com isso o compilador
 * ficava calado sobre todo acesso. Três referências erradas chegaram à tela e
 * ficaram lá:
 *
 *   booking.startTime      → o campo é `scheduledStartTime`  ("às undefined")
 *   customer.name          → são `firstName` e `lastName`     ("👤 undefined")
 *   customer?.name         → no link do Google Agenda         ("Cliente: ")
 *
 * É a última tela que o cliente vê depois de agendar, e mostrava `undefined`
 * em dois lugares.
 *
 * O `any` saiu — a tipagem por inferência é a proteção de verdade, e ela pega
 * qualquer campo novo que alguém erre. Este teste é o cinto: um `any` que
 * volte a esta página traz os erros de volta em silêncio, e aqui isso falha.
 */

const PAGE = path.resolve(__dirname, "..", "src", "app", "obrigado", "page.tsx");

/**
 * Comentários fora.
 *
 * As próprias notas do arquivo citam os campos errados para explicar o que
 * aconteceu — e sem esta limpeza o teste falharia por causa da explicação, não
 * do código. A primeira versão fez exatamente isso.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
}

describe("tela de confirmação", () => {
  const source = stripComments(fs.readFileSync(PAGE, "utf8"));

  it("não usa `any` — é o que deixou os campos errados passarem", () => {
    expect(source).not.toMatch(/:\s*any\b/);
  });

  it("não lê campos que não existem no schema", () => {
    // `Booking` não tem `startTime`; `BookingCustomerDetail` não tem `name`.
    expect(source).not.toMatch(/booking\.startTime\b/);
    expect(source).not.toMatch(/customer\??\.name\b/);
  });

  it("usa os campos reais", () => {
    expect(source).toContain("booking.scheduledStartTime");
    expect(source).toContain("customer.firstName");
    expect(source).toContain("customer.lastName");
  });
});
