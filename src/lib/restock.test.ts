import { describe, expect, it } from "vitest";
import {
  assessRestock,
  buildPurchaseList,
  CRITICAL_COVER_DAYS,
  STALE_DAYS,
  TARGET_COVER_DAYS,
} from "./restock";

/** Produto que vende 1 por dia: 30 unidades em 30 dias. */
const base = {
  minStockThreshold: 3,
  unitsSold: 30,
  windowDays: 30,
  daysSinceLastSale: 1,
};

describe("assessRestock", () => {
  it("produto que nunca vendeu não entra na reposição", () => {
    // O ponto inteiro de usar giro em vez de só o mínimo: estoque zerado de
    // algo que ninguém compra não é falta, é acerto.
    const r = assessRestock({
      ...base,
      stockQuantity: 0,
      unitsSold: 0,
      daysSinceLastSale: null,
    });
    expect(r.status).toBe("STALE");
    expect(r.suggestedOrder).toBe(0);
    expect(r.reason).toMatch(/Nunca vendeu/);
  });

  it("produto encalhado há muito tempo também não entra", () => {
    const r = assessRestock({
      ...base,
      stockQuantity: 0,
      unitsSold: 1,
      daysSinceLastSale: STALE_DAYS + 1,
    });
    expect(r.status).toBe("STALE");
    expect(r.suggestedOrder).toBe(0);
  });

  it("o mesmo estoque significa coisas opostas conforme o giro", () => {
    // O mínimo é neutralizado nos dois lados para isolar a variável que
    // interessa: só o giro muda.
    const semMinimo = { ...base, minStockThreshold: 0 };

    // Três unidades de um produto que vende 1/dia é emergência.
    const rapido = assessRestock({ ...semMinimo, stockQuantity: 3 });
    // Três unidades de um que vende 1 por mês é estoque para um trimestre.
    const lento = assessRestock({ ...semMinimo, stockQuantity: 3, unitsSold: 1 });

    expect(rapido.status).toBe("CRITICAL");
    expect(lento.status).toBe("OK");
    expect(lento.coverDays).toBeGreaterThan(60);
  });

  it("marca crítico quando não dá tempo de o pedido chegar", () => {
    const r = assessRestock({ ...base, stockQuantity: CRITICAL_COVER_DAYS });
    expect(r.status).toBe("CRITICAL");
    expect(r.coverDays).toBe(CRITICAL_COVER_DAYS);
  });

  it("respeita o mínimo definido pelo dono mesmo com cobertura folgada", () => {
    // O mínimo é a única informação que ele deu explicitamente; ignorá-la
    // seria dizer que ele não sabe do próprio negócio.
    const r = assessRestock({
      ...base,
      stockQuantity: 3,
      minStockThreshold: 3,
      unitsSold: 6, // 0,2/dia → 15 dias de cobertura
    });
    expect(r.status).toBe("LOW");
    expect(r.reason).toContain("mínimo");
  });

  it("sem estoque é OUT, e a sugestão cobre o alvo", () => {
    const r = assessRestock({ ...base, stockQuantity: 0 });
    expect(r.status).toBe("OUT");
    expect(r.coverDays).toBe(0);
    expect(r.suggestedOrder).toBe(TARGET_COVER_DAYS); // 1/dia × 30 dias
  });

  it("estoque negativo é furo, e a compra cobre o rombo", () => {
    // O PDV permite vender além do saldo de propósito, como indicador honesto
    // de oversell. A sugestão precisa somar o buraco, não ignorá-lo.
    const r = assessRestock({ ...base, stockQuantity: -5 });
    expect(r.status).toBe("OUT");
    expect(r.suggestedOrder).toBe(TARGET_COVER_DAYS + 5);
    expect(r.reason).toMatch(/furado/);
  });

  it("a sugestão nunca é negativa", () => {
    // Estoque muito acima do alvo não pode virar "comprar -40".
    const r = assessRestock({ ...base, stockQuantity: 500 });
    expect(r.status).toBe("OK");
    expect(r.suggestedOrder).toBe(0);
  });

  it("janela zero não vira divisão por zero", () => {
    const r = assessRestock({ ...base, stockQuantity: 10, windowDays: 0 });
    expect(Number.isFinite(r.velocityPerDay)).toBe(true);
  });

  it("a explicação sempre traz número", () => {
    // O dono repete isso no pedido ao fornecedor. "Estoque baixo" não serve;
    // "acaba em 3 dias" serve.
    for (const stock of [-2, 0, 3, 12, 60]) {
      expect(assessRestock({ ...base, stockQuantity: stock }).reason).toMatch(/\d/);
    }
  });
});

describe("buildPurchaseList", () => {
  it("monta o texto com nome, código e quantidade", () => {
    const txt = buildPurchaseList(
      [
        { name: "Pomada modeladora", sku: "PM-01", suggestedOrder: 12 },
        { name: "Toalha descartável", sku: null, suggestedOrder: 50 },
      ],
      "Barbearia Central"
    );
    expect(txt).toContain("Barbearia Central");
    expect(txt).toContain("Pomada modeladora (PM-01) — 12 un.");
    expect(txt).toContain("Toalha descartável — 50 un.");
  });

  it("ignora itens sem quantidade a pedir", () => {
    const txt = buildPurchaseList(
      [
        { name: "Tem bastante", suggestedOrder: 0 },
        { name: "Precisa", suggestedOrder: 4 },
      ],
      "X"
    );
    expect(txt).not.toContain("Tem bastante");
    expect(txt).toContain("Precisa");
  });

  it("devolve vazio quando não há nada a comprar", () => {
    // Vazio permite à tela esconder o botão em vez de mandar ao fornecedor um
    // pedido com zero itens.
    expect(buildPurchaseList([{ name: "A", suggestedOrder: 0 }], "X")).toBe("");
    expect(buildPurchaseList([], "X")).toBe("");
  });
});
