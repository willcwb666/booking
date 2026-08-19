import { describe, it, expect } from "vitest";
import { calculateNextReturnDate } from "./return-anchor";

describe("Dynamic Return Anchor Engine", () => {
  it("calcula ciclo de 21 dias para corte de cabelo", () => {
    const baseDate = new Date("2026-08-01T10:00:00Z");
    const result = calculateNextReturnDate("Corte Masculino", baseDate, "15:00");

    expect(result.cadenceDays).toBe(21);
    expect(result.suggestedTime).toBe("15:00");
    expect(result.discountPercentage).toBe(10);
  });

  it("calcula ciclo de 14 dias para barba e manicure", () => {
    const baseDate = new Date("2026-08-01T10:00:00Z");
    const resultBarba = calculateNextReturnDate("Barba Terapia", baseDate, "16:30");
    const resultManicure = calculateNextReturnDate("Manicure Completa", baseDate, "11:00");

    expect(resultBarba.cadenceDays).toBe(14);
    expect(resultManicure.cadenceDays).toBe(14);
  });

  it("evita domingos e ajusta para sábado útil", () => {
    // 2026-08-02 é domingo, +21 dias = 2026-08-23 (domingo) -> deve ajustar para 2026-08-22 (sábado)
    const baseDate = new Date("2026-08-02T10:00:00Z");
    const result = calculateNextReturnDate("Corte", baseDate, "14:00");

    const dayOfWeek = new Date(`${result.suggestedDate}T12:00:00Z`).getDay();
    expect(dayOfWeek).not.toBe(0); // Nunca domingo
  });
});
