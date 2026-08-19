import { describe, expect, it } from "vitest";
import {
  computeTravelBlocks,
  travelMinutesBetween,
  travelBlockTitle,
  type Stop,
  type DriveTimeOptions,
} from "./drive-time";
import { formatDistance } from "./haversine";

const OPTS: DriveTimeOptions = { minutesPerKm: 3, maxMinutes: 120 };

/** Curitiba, centro. */
const A = { latitude: -25.4284, longitude: -49.2733 };
/** ~2 km ao norte de A — 0.018° de latitude ≈ 2 km. */
const B = { latitude: -25.4104, longitude: -49.2733 };

const stop = (over: Partial<Stop> = {}): Stop => ({
  startTime: "09:00",
  endTime: "10:00",
  latitude: A.latitude,
  longitude: A.longitude,
  ...over,
});

describe("travelMinutesBetween", () => {
  it("converte distância em minutos pelo fator da empresa", () => {
    const { minutes, distanceMeters } = travelMinutesBetween(A, B, OPTS);
    expect(distanceMeters).toBeGreaterThan(1900);
    expect(distanceMeters).toBeLessThan(2100);
    // ~2 km × 3 min/km = ~6 min
    expect(minutes).toBeGreaterThanOrEqual(6);
    expect(minutes).toBeLessThanOrEqual(7);
  });

  it("arredonda para cima", () => {
    // 100 m × 3 min/km = 0,3 min. Arredondar para baixo daria zero, e a soma
    // dos zeros do dia é o atraso da última visita.
    const perto = { latitude: A.latitude + 0.0009, longitude: A.longitude };
    expect(travelMinutesBetween(A, perto, OPTS).minutes).toBe(1);
  });

  it("aplica o teto — geocodificação errada não apaga o dia", () => {
    // São Paulo: ~340 km de Curitiba. Sem teto, 3 min/km daria mais de 17h.
    const longe = { latitude: -23.5505, longitude: -46.6333 };
    expect(travelMinutesBetween(A, longe, { minutesPerKm: 3, maxMinutes: 120 }).minutes).toBe(120);
  });
});

describe("computeTravelBlocks", () => {
  it("reserva as duas pontas da janela livre", () => {
    // 10:00–13:00 livre (180 min), viagem de ~6 min: sobra miolo de verdade.
    const blocks = computeTravelBlocks(
      [
        stop({ startTime: "09:00", endTime: "10:00" }),
        stop({ startTime: "13:00", endTime: "14:00", ...B }),
      ],
      OPTS
    );

    expect(blocks).toHaveLength(2);
    expect(blocks[0].startTime).toBe("10:00");
    expect(blocks[1].endTime).toBe("13:00");
    // O miolo continua livre — quem couber ali tem folga dos dois lados.
    expect(blocks[0].endTime < blocks[1].startTime).toBe(true);
  });

  it("janela apertada vira um bloco só, cobrindo tudo", () => {
    // 10:00–10:10 com viagem de ~6 min: duas reservas de 6 não cabem em 10.
    const blocks = computeTravelBlocks(
      [
        stop({ startTime: "09:00", endTime: "10:00" }),
        stop({ startTime: "10:10", endTime: "11:00", ...B }),
      ],
      OPTS
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].startTime).toBe("10:00");
    expect(blocks[0].endTime).toBe("10:10");
  });

  it("marca como insuficiente quando a viagem não cabe na janela", () => {
    // 5 min de janela para ~6 min de viagem: os dois já estão marcados, e o
    // dono precisa saber que esse par não fecha.
    const blocks = computeTravelBlocks(
      [
        stop({ startTime: "09:00", endTime: "10:00" }),
        stop({ startTime: "10:05", endTime: "11:00", ...B }),
      ],
      OPTS
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].insufficient).toBe(true);
  });

  it("janela folgada não é marcada como insuficiente", () => {
    const blocks = computeTravelBlocks(
      [
        stop({ startTime: "09:00", endTime: "10:00" }),
        stop({ startTime: "13:00", endTime: "14:00", ...B }),
      ],
      OPTS
    );
    expect(blocks.every((b) => b.insufficient)).toBe(false);
  });

  it("mesmo endereço não gera bloqueio", () => {
    // Dois banhos na mesma casa, dois carros na mesma garagem. Sem esta regra
    // o recurso puniria o agendamento mais lucrativo do dia.
    const blocks = computeTravelBlocks(
      [
        stop({ startTime: "09:00", endTime: "10:00" }),
        stop({ startTime: "10:00", endTime: "11:00" }),
      ],
      OPTS
    );
    expect(blocks).toEqual([]);
  });

  it("sem coordenada de um dos lados não inventa bloqueio", () => {
    const blocks = computeTravelBlocks(
      [
        stop({ startTime: "09:00", endTime: "10:00" }),
        stop({ startTime: "13:00", endTime: "14:00", latitude: null, longitude: null }),
      ],
      OPTS
    );
    expect(blocks).toEqual([]);
  });

  it("ordena por horário antes de parear", () => {
    // A ordem que vem do banco não é garantia de nada; parear fora de ordem
    // produziria janelas negativas e nenhum bloqueio.
    const blocks = computeTravelBlocks(
      [
        stop({ startTime: "13:00", endTime: "14:00", ...B }),
        stop({ startTime: "09:00", endTime: "10:00" }),
      ],
      OPTS
    );
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].startTime).toBe("10:00");
  });

  it("atendimentos sobrepostos não geram bloqueio", () => {
    const blocks = computeTravelBlocks(
      [
        stop({ startTime: "09:00", endTime: "11:00" }),
        stop({ startTime: "10:00", endTime: "12:00", ...B }),
      ],
      OPTS
    );
    expect(blocks).toEqual([]);
  });

  it("só pares consecutivos — o primeiro e o terceiro não se falam", () => {
    const C = { latitude: -25.3924, longitude: -49.2733 };
    const blocks = computeTravelBlocks(
      [
        stop({ startTime: "08:00", endTime: "09:00" }),
        stop({ startTime: "12:00", endTime: "13:00", ...B }),
        stop({ startTime: "16:00", endTime: "17:00", ...C }),
      ],
      OPTS
    );
    // Duas janelas, duas reservas cada.
    expect(blocks).toHaveLength(4);
  });

  it("um atendimento sozinho não tem trecho", () => {
    expect(computeTravelBlocks([stop()], OPTS)).toEqual([]);
    expect(computeTravelBlocks([], OPTS)).toEqual([]);
  });

  it("configuração zerada desliga o cálculo em vez de dividir por zero", () => {
    const stops = [
      stop({ startTime: "09:00", endTime: "10:00" }),
      stop({ startTime: "13:00", endTime: "14:00", ...B }),
    ];
    expect(computeTravelBlocks(stops, { minutesPerKm: 0, maxMinutes: 120 })).toEqual([]);
    expect(computeTravelBlocks(stops, { minutesPerKm: 3, maxMinutes: 0 })).toEqual([]);
  });
});

describe("travelBlockTitle", () => {
  it("mostra a conta, para o dono poder discordar dela", () => {
    const [block] = computeTravelBlocks(
      [
        stop({ startTime: "09:00", endTime: "10:00" }),
        stop({ startTime: "13:00", endTime: "14:00", ...B }),
      ],
      OPTS
    );
    const title = travelBlockTitle(block, formatDistance);
    expect(title).toContain("min");
    expect(title).toContain("km");
    expect(title).not.toContain("não fecha");
  });

  it("avisa no título quando o par não fecha", () => {
    const [block] = computeTravelBlocks(
      [
        stop({ startTime: "09:00", endTime: "10:00" }),
        stop({ startTime: "10:05", endTime: "11:00", ...B }),
      ],
      OPTS
    );
    expect(travelBlockTitle(block, formatDistance)).toContain("não fecha");
  });
});
