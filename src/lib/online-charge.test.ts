import { describe, expect, it } from "vitest";
import { verifyChargeAmount } from "./online-charge";

describe("verifyChargeAmount", () => {
  it("recusa pagamento menor que o devido", () => {
    expect(verifyChargeAmount(200, 1)).toEqual({ outcome: "short", expected: 200, paid: 1 });
  });

  it("aceita o valor exato", () => {
    expect(verifyChargeAmount(200, 200).outcome).toBe("covered");
  });

  it("aceita pagamento a maior", () => {
    // O agendamento está pago. O que fazer com a diferença não é decisão deste
    // módulo.
    expect(verifyChargeAmount(200, 250).outcome).toBe("covered");
  });

  it("tolera um centavo de arredondamento", () => {
    expect(verifyChargeAmount(200, 199.99).outcome).toBe("covered");
    expect(verifyChargeAmount(200, 199.98).outcome).toBe("short");
  });

  it("tolera o erro de ponto flutuante da soma de decimais", () => {
    // 0.1 + 0.2 === 0.30000000000000004. Sem tolerância, um pagamento exato
    // de 0.30 seria recusado por ser "menor".
    expect(verifyChargeAmount(0.1 + 0.2, 0.3).outcome).toBe("covered");
  });

  it("trata zero devido como valor a conferir, não como ausência", () => {
    // Agendamento coberto por vale-presente deve cobrar exatamente zero.
    expect(verifyChargeAmount(0, 0).outcome).toBe("covered");
  });

  it("não consegue conferir sem valor esperado gravado", () => {
    expect(verifyChargeAmount(null, 10)).toEqual({
      outcome: "unverifiable",
      reason: "sem-valor-esperado",
    });
    expect(verifyChargeAmount(undefined, 10).outcome).toBe("unverifiable");
  });

  it("não consegue conferir sem valor pago informado pelo gateway", () => {
    expect(verifyChargeAmount(200, undefined)).toEqual({
      outcome: "unverifiable",
      reason: "sem-valor-pago",
    });
    expect(verifyChargeAmount(200, Number.NaN).outcome).toBe("unverifiable");
  });
});
