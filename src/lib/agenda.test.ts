import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/test";
});

async function load() {
  return import("./agenda");
}

describe("slotProfessionalKey", () => {
  it("converte ausência de profissional em string vazia, nunca null", async () => {
    const { slotProfessionalKey } = await load();
    // No Postgres, dois NULLs são distintos num índice único — se esta chave
    // pudesse ser null, a trava contra duplo agendamento sumiria justamente
    // nas agendas sem equipe.
    expect(slotProfessionalKey(null)).toBe("");
    expect(slotProfessionalKey(undefined)).toBe("");
  });

  it("preserva o id do profissional", async () => {
    const { slotProfessionalKey } = await load();
    expect(slotProfessionalKey("pro_123")).toBe("pro_123");
  });
});

describe("generateSlots", () => {
  const base = {
    startDate: "2026-01-01",
    endDate: null,
    workingDays: [1, 2, 3, 4, 5], // seg–sex
    startTime: "09:00",
    endTime: "12:00",
    intervalMinutes: 30,
  };

  it("gera a grade completa num dia útil", async () => {
    const { generateSlots } = await load();
    const slots = generateSlots(base, "2026-01-05"); // segunda
    expect(slots).toHaveLength(6);
    expect(slots[0]).toEqual({ date: "2026-01-05", startTime: "09:00", endTime: "09:30" });
    expect(slots[5]).toEqual({ date: "2026-01-05", startTime: "11:30", endTime: "12:00" });
  });

  it("não gera nada fora dos dias de funcionamento", async () => {
    const { generateSlots } = await load();
    expect(generateSlots(base, "2026-01-04")).toEqual([]); // domingo
  });

  it("não gera nada antes da data inicial nem depois da final", async () => {
    const { generateSlots } = await load();
    expect(generateSlots(base, "2025-12-31")).toEqual([]);
    expect(generateSlots({ ...base, endDate: "2026-01-05" }, "2026-01-06")).toEqual([]);
  });

  it("dia bloqueado zera a grade", async () => {
    const { generateSlots } = await load();
    const slots = generateSlots(base, "2026-01-05", {
      type: "BLOCKED_DAY",
      startTime: null,
      endTime: null,
    });
    expect(slots).toEqual([]);
  });

  it("horário especial substitui a grade e abre até dia não útil", async () => {
    const { generateSlots } = await load();
    const slots = generateSlots(base, "2026-01-04", {
      type: "CUSTOM_HOURS",
      startTime: "14:00",
      endTime: "15:00",
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].startTime).toBe("14:00");
    expect(slots[1].endTime).toBe("15:00");
  });

  it("não gera slot que ultrapasse o horário de fechamento", async () => {
    const { generateSlots } = await load();
    const slots = generateSlots({ ...base, endTime: "10:40", intervalMinutes: 30 }, "2026-01-05");
    expect(slots.map((s) => s.endTime)).toEqual(["09:30", "10:00", "10:30"]);
  });
});
