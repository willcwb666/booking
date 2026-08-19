import { describe, expect, it } from "vitest";
import {
  addMonthsISO,
  autoGranularity,
  bucketLabel,
  enumerateBuckets,
  percentDelta,
  rangeQuery,
  resolveRange,
  startOfWeekISO,
  todayISO,
} from "./analytics-range";

describe("resolveRange", () => {
  it("usa 30 dias quando não há parâmetro", () => {
    const r = resolveRange({});
    expect(r.key).toBe("30d");
    expect(r.days).toBe(30);
    expect(r.to).toBe(todayISO());
  });

  it("cai no padrão em vez de quebrar com recorte inválido", () => {
    expect(resolveRange({ range: "banana" }).key).toBe("30d");
    // `custom` sem datas não pode virar um intervalo indefinido
    expect(resolveRange({ range: "custom" }).key).toBe("30d");
    expect(resolveRange({ range: "custom", from: "abc", to: "2026-01-01" }).key).toBe(
      "30d"
    );
  });

  it("inverte from/to trocados em vez de devolver intervalo vazio", () => {
    const r = resolveRange({ range: "custom", from: "2026-03-31", to: "2026-03-01" });
    expect(r.from).toBe("2026-03-01");
    expect(r.to).toBe("2026-03-31");
    expect(r.days).toBe(31);
  });

  it("limita o recorte custom para não varrer a tabela inteira", () => {
    const r = resolveRange({ range: "custom", from: "2000-01-01", to: "2026-01-01" });
    expect(r.days).toBeLessThanOrEqual(731);
  });

  it("o período anterior encosta no início sem sobrepor", () => {
    const r = resolveRange({ range: "custom", from: "2026-03-01", to: "2026-03-31" });
    expect(r.prevTo).toBe("2026-02-28");
    expect(r.prevFrom).toBe("2026-01-29");
    // mesmo tamanho dos dois lados
    expect(r.days).toBe(31);
  });

  it("respeita a granularidade explícita e ignora valor inválido", () => {
    expect(resolveRange({ range: "7d", g: "month" }).granularity).toBe("month");
    expect(resolveRange({ range: "7d", g: "decade" }).granularity).toBe("day");
  });
});

describe("autoGranularity", () => {
  it("mantém o gráfico numa faixa legível de pontos", () => {
    expect(autoGranularity(7)).toBe("day");
    expect(autoGranularity(45)).toBe("day");
    expect(autoGranularity(90)).toBe("week");
    expect(autoGranularity(365)).toBe("month");
  });
});

describe("enumerateBuckets", () => {
  it("inclui os buckets vazios para o gráfico não pular dias sem movimento", () => {
    const r = resolveRange({ range: "custom", from: "2026-03-01", to: "2026-03-05" });
    expect(enumerateBuckets({ ...r, granularity: "day" })).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
      "2026-03-05",
    ]);
  });

  it("agrupa por mês cobrindo as pontas parciais", () => {
    const r = resolveRange({ range: "custom", from: "2026-01-15", to: "2026-03-02" });
    expect(enumerateBuckets({ ...r, granularity: "month" })).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
  });

  it("alinha a semana na segunda, como o date_trunc do Postgres", () => {
    // 2026-03-04 é uma quarta-feira
    expect(startOfWeekISO("2026-03-04")).toBe("2026-03-02");
    expect(startOfWeekISO("2026-03-02")).toBe("2026-03-02");
    expect(startOfWeekISO("2026-03-08")).toBe("2026-03-02");
  });
});

describe("addMonthsISO", () => {
  it("não transborda para o mês seguinte em dia 31", () => {
    expect(addMonthsISO("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonthsISO("2024-03-31", -1)).toBe("2024-02-29");
  });
});

describe("percentDelta", () => {
  it("não inventa crescimento quando a base é zero", () => {
    expect(percentDelta(10, 0)).toBeNull();
    expect(percentDelta(0, 0)).toBeNull();
  });

  it("calcula alta e queda", () => {
    expect(percentDelta(150, 100)).toBe(50);
    expect(percentDelta(50, 100)).toBe(-50);
  });
});

describe("rangeQuery", () => {
  it("omite a granularidade quando ela é a automática", () => {
    const r = resolveRange({ range: "7d" });
    expect(rangeQuery(r)).toBe("?range=7d");
  });

  it("grava a granularidade quando o usuário escolheu outra", () => {
    const r = resolveRange({ range: "7d" });
    expect(rangeQuery(r, { granularity: "month" })).toBe("?range=7d&g=month");
  });

  it("leva as datas junto no recorte custom", () => {
    const r = resolveRange({ range: "custom", from: "2026-03-01", to: "2026-03-31" });
    expect(rangeQuery(r)).toContain("from=2026-03-01");
    expect(rangeQuery(r)).toContain("to=2026-03-31");
  });
});

describe("bucketLabel", () => {
  it("encurta conforme a granularidade", () => {
    expect(bucketLabel("2026-03-04", "day")).toBe("04/03");
    expect(bucketLabel("2026-03-01", "month")).toBe("mar/26");
  });
});
