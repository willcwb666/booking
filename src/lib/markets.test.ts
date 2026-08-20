import { describe, expect, it } from "vitest";
import { findMarketByDialCode, findMarketByTimezone, getMarket } from "./markets";

/**
 * Inferência de mercado pelo DDI.
 *
 * O que está em jogo não é cosmético: o mercado define `Company.currency`,
 * `locale` e `timezone`. Errar aqui faz o salão precificar em dólar por engano
 * — e desde `68fd608` a moeda é carimbada em cada venda, então o erro se
 * espalha pelo histórico em vez de ser corrigido com um clique depois.
 */
describe("findMarketByDialCode", () => {
  it("reconhece os DDIs de dígito único e de dois dígitos", () => {
    expect(findMarketByDialCode("+55 41 99562-0999")?.code).toBe("BR");
    expect(findMarketByDialCode("+52 55 1234 5678")?.code).toBe("MX");
    expect(findMarketByDialCode("+44 20 7946 0958")?.code).toBe("GB");
  });

  it("reconhece DDI de três dígitos sem se confundir com os de dois", () => {
    // "+351" começa com "35", e nenhum mercado usa "+35" — mas a ordenação por
    // prefixo mais longo é o que garante isso quando um dia usar.
    expect(findMarketByDialCode("+351 912 345 678")?.code).toBe("PT");
  });

  it("aceita o número colado de qualquer jeito", () => {
    expect(findMarketByDialCode("+5541995620999")?.code).toBe("BR");
    expect(findMarketByDialCode("  +55 (41) 99562-0999  ")?.code).toBe("BR");
  });

  it("número nacional não infere nada", () => {
    /**
     * Sem o "+", "41 99562-0999" é só um código de área. Inferir país daí
     * trocaria a moeda da empresa por causa de um DDD.
     */
    expect(findMarketByDialCode("41 99562-0999")).toBeUndefined();
    expect(findMarketByDialCode("(970) 402-4364")).toBeUndefined();
    expect(findMarketByDialCode("")).toBeUndefined();
    expect(findMarketByDialCode("+")).toBeUndefined();
  });

  it("DDI desconhecido não chuta", () => {
    // +99 não existe no catálogo. Devolver "o primeiro da lista" seria pior
    // que devolver nada — a tela deixaria de mostrar que não sabe.
    expect(findMarketByDialCode("+99 123456")).toBeUndefined();
  });

  describe("o empate do +1", () => {
    it("mantém o mercado atual quando ele é um dos dois", () => {
      // Nenhuma quantidade de dígitos separa EUA de Canadá. A escolha de quem
      // está preenchendo vale mais que o palpite.
      expect(findMarketByDialCode("+1 416 555 0123", "CA")?.code).toBe("CA");
      expect(findMarketByDialCode("+1 970 402 4364", "US")?.code).toBe("US");
    });

    it("cai nos EUA sem mercado atual, ou com um mercado que não empata", () => {
      expect(findMarketByDialCode("+1 970 402 4364")?.code).toBe("US");
      // Quem estava em BR e digita +1 não fica em BR: o DDI é evidência real.
      expect(findMarketByDialCode("+1 970 402 4364", "BR")?.code).toBe("US");
    });
  });

  it("não é enganado por um número que começa com o dígito do outro DDI", () => {
    // "+5511…" é Brasil, não "+5" seguido de coisa nenhuma.
    expect(findMarketByDialCode("+55 11 91234-5678")?.code).toBe("BR");
    // "+1 555…" é +1, não "+15" (que não existe).
    expect(findMarketByDialCode("+1 555 010 1234")?.code).toBe("US");
  });
});

describe("coerência do catálogo", () => {
  it("todo mercado tem ao menos um fuso, e ele se resolve de volta", () => {
    // `findMarketByTimezone` é a base da detecção pelo navegador. Um fuso
    // duplicado entre dois mercados faria a detecção devolver o errado.
    const seen = new Map<string, string>();
    for (const code of ["BR", "US", "CA", "MX", "AR", "PT", "ES", "GB", "AU"]) {
      const market = getMarket(code);
      expect(market, `mercado ${code} sumiu do catálogo`).toBeDefined();
      expect(market!.timezones.length).toBeGreaterThan(0);
      expect(market!.dialCode.startsWith("+")).toBe(true);

      for (const tz of market!.timezones) {
        const previous = seen.get(tz.id);
        expect(
          previous,
          `fuso ${tz.id} aparece em ${previous} e em ${code} — a detecção por fuso devolveria um dos dois por acaso`
        ).toBeUndefined();
        seen.set(tz.id, code);
        expect(findMarketByTimezone(tz.id)?.code).toBe(code);
      }
    }
  });
});
