import { describe, expect, it } from "vitest";
import {
  buildSuggestions,
  computeRetainUntil,
  isPhotoKind,
  isRetentionExpired,
  isServiceRecordEmpty,
} from "./client-vault";

describe("computeRetainUntil", () => {
  it("soma meses de calendário", () => {
    const from = new Date(Date.UTC(2026, 0, 15));
    expect(computeRetainUntil(from, 24).toISOString().slice(0, 10)).toBe("2028-01-15");
  });

  it("31 de janeiro + 1 mês não vira março", () => {
    // Somar mês em JavaScript estoura para 3 de março, porque fevereiro não
    // tem dia 31 — e o prazo prometido esticaria sozinho.
    const from = new Date(Date.UTC(2026, 0, 31));
    expect(computeRetainUntil(from, 1).toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("nunca aceita prazo zero ou negativo", () => {
    // Prazo zero apagaria a foto na próxima passada do expurgo — um campo mal
    // preenchido não pode destruir o acervo.
    const from = new Date(Date.UTC(2026, 5, 10));
    expect(computeRetainUntil(from, 0) > from).toBe(true);
    expect(computeRetainUntil(from, -12) > from).toBe(true);
  });
});

describe("isRetentionExpired", () => {
  const now = new Date(Date.UTC(2026, 7, 20));

  it("vencido inclui o próprio instante do vencimento", () => {
    expect(isRetentionExpired(now, now)).toBe(true);
  });

  it("prazo futuro não expurga", () => {
    expect(isRetentionExpired(new Date(Date.UTC(2026, 7, 21)), now)).toBe(false);
  });
});

describe("buildSuggestions", () => {
  it("mantém a ordem recebida — mais recente primeiro", () => {
    expect(buildSuggestions(["9.3 + 20 vol", "7.1 + 20 vol"])).toEqual([
      "9.3 + 20 vol",
      "7.1 + 20 vol",
    ]);
  });

  it("a mesma fórmula digitada de dois jeitos aparece uma vez", () => {
    // Lista que repete a mesma coisa ensina o profissional a ignorá-la.
    expect(buildSuggestions(["7.1 + 9.3", "7.1  +  9.3", "7.1 + 9.3 "])).toEqual(["7.1 + 9.3"]);
  });

  it("ignora vazio, nulo e só espaço", () => {
    expect(buildSuggestions([null, "", "   ", undefined, "20 vol"])).toEqual(["20 vol"]);
  });

  it("respeita o limite", () => {
    const many = Array.from({ length: 30 }, (_, i) => `formula ${i}`);
    expect(buildSuggestions(many, 5)).toHaveLength(5);
  });
});

describe("isServiceRecordEmpty", () => {
  it("ficha totalmente em branco não deve ser gravada", () => {
    expect(isServiceRecordEmpty({})).toBe(true);
    expect(
      isServiceRecordEmpty({ formula: "  ", notes: "", processingMinutes: null })
    ).toBe(true);
  });

  it("um único campo preenchido já é uma ficha", () => {
    expect(isServiceRecordEmpty({ clipperGuard: "2 nas laterais" })).toBe(false);
    expect(isServiceRecordEmpty({ processingMinutes: 35 })).toBe(false);
  });

  it("tempo de pausa zero não conta como preenchido", () => {
    expect(isServiceRecordEmpty({ processingMinutes: 0 })).toBe(true);
  });
});

describe("isPhotoKind", () => {
  it("aceita só antes e depois", () => {
    expect(isPhotoKind("BEFORE")).toBe(true);
    expect(isPhotoKind("AFTER")).toBe(true);
    expect(isPhotoKind("DURING")).toBe(false);
    expect(isPhotoKind("")).toBe(false);
  });
});
