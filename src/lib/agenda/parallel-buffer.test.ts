import { describe, it, expect } from "vitest";
import { findParallelGapSlots, type ServiceStep } from "./parallel-buffer";

describe("Parallel Resource Buffer Engine", () => {
  it("encontra janela de 40 min para encaixe durante pausa química no lavatório", () => {
    const steps: ServiceStep[] = [
      { name: "Aplicação Química", durationMinutes: 20, resourceRequired: "MAIN_CHAIR", isTechnicianRequired: true },
      { name: "Ação do Produto / Lavatório", durationMinutes: 40, resourceRequired: "WASH_AREA", isTechnicianRequired: false },
      { name: "Secagem & Finalização", durationMinutes: 20, resourceRequired: "MAIN_CHAIR", isTechnicianRequired: true },
    ];

    const gaps = findParallelGapSlots("14:00", steps);

    expect(gaps.length).toBe(1);
    expect(gaps[0].startTime).toBe("14:20");
    expect(gaps[0].endTime).toBe("15:00");
    expect(gaps[0].availableMinutes).toBe(40);
    expect(gaps[0].canFitServiceDuration).toBe(35); // 35 min úteis
  });

  it("não gera gaps quando a cadeira principal está continuamente ocupada", () => {
    const steps: ServiceStep[] = [
      { name: "Corte Cabelo", durationMinutes: 30, resourceRequired: "MAIN_CHAIR", isTechnicianRequired: true },
      { name: "Barba Terapia", durationMinutes: 20, resourceRequired: "MAIN_CHAIR", isTechnicianRequired: true },
    ];

    const gaps = findParallelGapSlots("10:00", steps);
    expect(gaps.length).toBe(0);
  });
});
