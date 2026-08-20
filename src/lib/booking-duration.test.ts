import { describe, expect, it } from "vitest";
import {
  slotRunFrom,
  slotsNeeded,
  startableSlots,
  totalServiceMinutes,
} from "./booking-duration";

const slot = (startTime: string, endTime: string, date = "2027-03-15") => ({
  date,
  startTime,
  endTime,
});

describe("totalServiceMinutes", () => {
  it("soma serviços e extras", () => {
    // Corte (30) + barba (20) + hidratação (40).
    expect(
      totalServiceMinutes([
        { estimatedMinutes: 30 },
        { estimatedMinutes: 20 },
        { estimatedMinutes: 40 },
      ])
    ).toBe(90);
  });

  it("multiplica pela quantidade", () => {
    // Duas escovas na mesma ida é o dobro do tempo, não o mesmo tempo.
    expect(totalServiceMinutes([{ estimatedMinutes: 45, quantity: 2 }])).toBe(90);
  });

  it("ignora duração inválida em vez de virar NaN", () => {
    expect(
      totalServiceMinutes([
        { estimatedMinutes: 30 },
        { estimatedMinutes: 0 },
        { estimatedMinutes: -10 },
        { estimatedMinutes: Number.NaN },
        { estimatedMinutes: 20, quantity: 0 },
      ])
    ).toBe(30);
  });

  it("orçamento vazio é zero", () => {
    expect(totalServiceMinutes([])).toBe(0);
  });
});

describe("slotsNeeded", () => {
  it("arredonda para cima — meio slot não é vendável", () => {
    // 45 minutos numa grade de 30 ocupa DOIS slots. Os 15 restantes não são
    // vendáveis para ninguém, e fingir que são é o mesmo defeito menor.
    expect(slotsNeeded(45, 30)).toBe(2);
    expect(slotsNeeded(90, 30)).toBe(3);
    expect(slotsNeeded(30, 30)).toBe(1);
    expect(slotsNeeded(31, 30)).toBe(2);
  });

  it("nunca devolve menos que um slot", () => {
    // Serviço sem duração cadastrada ainda ocupa a cadeira.
    expect(slotsNeeded(0, 30)).toBe(1);
    expect(slotsNeeded(-10, 30)).toBe(1);
    expect(slotsNeeded(60, 0)).toBe(1);
    expect(slotsNeeded(Number.NaN, 30)).toBe(1);
  });
});

describe("startableSlots", () => {
  const grade = [
    slot("09:00", "09:30"),
    slot("09:30", "10:00"),
    slot("10:00", "10:30"),
    // buraco das 10:30 às 11:30 (almoço ou horário já vendido)
    slot("11:30", "12:00"),
    slot("12:00", "12:30"),
  ];

  it("com um slot, devolve a grade inteira", () => {
    expect(startableSlots(grade, 1)).toHaveLength(5);
  });

  it("não atravessa buraco na grade", () => {
    /**
     * Sem a checagem de contiguidade, 10:00 entraria como início de um
     * atendimento de duas horas e o cliente compraria um horário que passa por
     * cima do almoço — ou de outro cliente.
     */
    const starts = startableSlots(grade, 2).map((s) => s.startTime);
    expect(starts).toEqual(["09:00", "09:30", "11:30"]);
    expect(starts).not.toContain("10:00");
  });

  it("três slots seguidos só cabem no começo do dia", () => {
    expect(startableSlots(grade, 3).map((s) => s.startTime)).toEqual(["09:00"]);
  });

  it("pedindo mais slots do que existem, não sobra início nenhum", () => {
    expect(startableSlots(grade, 9)).toEqual([]);
  });

  it("ordena antes de avaliar — a ordem do banco não é garantia", () => {
    const embaralhada = [slot("10:00", "10:30"), slot("09:00", "09:30"), slot("09:30", "10:00")];
    expect(startableSlots(embaralhada, 3).map((s) => s.startTime)).toEqual(["09:00"]);
  });

  it("não atravessa a virada do dia", () => {
    const doisDias = [slot("23:30", "00:00", "2027-03-15"), slot("00:00", "00:30", "2027-03-16")];
    expect(startableSlots(doisDias, 2)).toEqual([]);
  });
});

describe("slotRunFrom", () => {
  const grade = [
    slot("09:00", "09:30"),
    slot("09:30", "10:00"),
    slot("10:00", "10:30"),
    slot("11:30", "12:00"),
  ];

  it("devolve exatamente os slots que serão ocupados", () => {
    const run = slotRunFrom(grade, "09:00", 3);
    expect(run.map((s) => s.startTime)).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("corrida que não fecha devolve VAZIO, não o que deu", () => {
    /**
     * Meia reserva é o pior estado possível: o cliente sai achando que marcou,
     * e a segunda metade do tempo continua vendida para outro. O chamador tem
     * de tratar isto como "horário indisponível".
     */
    expect(slotRunFrom(grade, "10:00", 2)).toEqual([]);
    expect(slotRunFrom(grade, "11:30", 2)).toEqual([]);
  });

  it("início inexistente devolve vazio", () => {
    expect(slotRunFrom(grade, "07:00", 1)).toEqual([]);
  });

  it("um slot só é o próprio", () => {
    expect(slotRunFrom(grade, "11:30", 1).map((s) => s.startTime)).toEqual(["11:30"]);
  });
});
