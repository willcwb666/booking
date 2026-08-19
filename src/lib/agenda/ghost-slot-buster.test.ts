import { describe, it, expect } from "vitest";
import { calculateGhostSlotDiscount } from "./ghost-slot-buster";

describe("Ghost Slot Buster Engine", () => {
  it("identifica vaga de última hora e aplica 25% OFF para horários em até 60 minutos", () => {
    const now = new Date("2026-08-18T14:00:00Z");
    const slotTime = new Date("2026-08-18T14:45:00Z"); // 45 min no futuro

    const result = calculateGhostSlotDiscount(slotTime, now, 100);
    expect(result.isGhostSlot).toBe(true);
    expect(result.discountPercentage).toBe(25);
    expect(result.flashPrice).toBe(75);
    expect(result.minutesUntilStart).toBe(45);
  });

  it("aplica 20% OFF para horários entre 60 e 120 minutos", () => {
    const now = new Date("2026-08-18T14:00:00Z");
    const slotTime = new Date("2026-08-18T15:30:00Z"); // 90 min no futuro

    const result = calculateGhostSlotDiscount(slotTime, now, 100);
    expect(result.isGhostSlot).toBe(true);
    expect(result.discountPercentage).toBe(20);
    expect(result.flashPrice).toBe(80);
  });

  it("rejeita horários fora da janela de última hora (> 180 min ou passados)", () => {
    const now = new Date("2026-08-18T14:00:00Z");
    const farFuture = new Date("2026-08-18T19:00:00Z"); // 5h no futuro
    const pastTime = new Date("2026-08-18T13:30:00Z"); // passado

    expect(calculateGhostSlotDiscount(farFuture, now).isGhostSlot).toBe(false);
    expect(calculateGhostSlotDiscount(pastTime, now).isGhostSlot).toBe(false);
  });
});
