import { describe, expect, it } from "vitest";
import {
  computeGoalProgress,
  progressBarWidth,
  projectDayTotal,
  rankTeam,
} from "./team-goals";

describe("computeGoalProgress", () => {
  it("calcula percentual, restante e conclusão", () => {
    const p = computeGoalProgress(240, 300);
    expect(p.percent).toBe(80);
    expect(p.remaining).toBe(60);
    expect(p.reached).toBe(false);
  });

  it("não corta o percentual em 100", () => {
    // Cortar esconderia justamente o dia excepcional, que é o que a pessoa quer
    // ver e o dono quer saber.
    expect(computeGoalProgress(420, 300).percent).toBe(140);
  });

  it("meta batida não deixa restante negativo", () => {
    const p = computeGoalProgress(420, 300);
    expect(p.remaining).toBe(0);
    expect(p.reached).toBe(true);
  });

  it("sem meta devolve nulo, não zero", () => {
    // "Não tenho meta" e "não vendi nada" não podem parecer a mesma coisa.
    for (const goal of [null, undefined, 0, -50, "abc", NaN]) {
      const p = computeGoalProgress(120, goal);
      expect(p.goal).toBeNull();
      expect(p.percent).toBeNull();
      expect(p.remaining).toBeNull();
      expect(p.achieved).toBe(120);
    }
  });

  it("meta aceita decimal vindo do Prisma como string", () => {
    expect(computeGoalProgress(150, "300.00").percent).toBe(50);
  });

  it("faturamento inválido vira zero", () => {
    expect(computeGoalProgress(NaN, 300).achieved).toBe(0);
    expect(computeGoalProgress(-10, 300).achieved).toBe(0);
  });
});

describe("progressBarWidth", () => {
  it("tem teto de 100 — só para desenhar", () => {
    expect(progressBarWidth(140)).toBe(100);
    expect(progressBarWidth(80)).toBe(80);
  });

  it("sem meta a barra não existe", () => {
    expect(progressBarWidth(null)).toBe(0);
    expect(progressBarWidth(-5)).toBe(0);
  });
});

describe("rankTeam", () => {
  const team = [
    { professionalId: "a", name: "Ana", revenue: 300 },
    { professionalId: "b", name: "Bruno", revenue: 500 },
    { professionalId: "c", name: "Carla", revenue: 300 },
    { professionalId: "d", name: "Davi", revenue: 100 },
  ];

  it("ordena por faturamento", () => {
    expect(rankTeam(team).map((r) => r.professionalId)).toEqual(["b", "a", "c", "d"]);
  });

  it("empate divide a posição, e a seguinte pula", () => {
    // Inventar uma ordem entre dois números iguais cria uma derrota que não
    // aconteceu.
    const ranked = rankTeam(team);
    expect(ranked.find((r) => r.professionalId === "a")?.position).toBe(2);
    expect(ranked.find((r) => r.professionalId === "c")?.position).toBe(2);
    expect(ranked.find((r) => r.professionalId === "d")?.position).toBe(4);
  });

  it("equipe vazia não quebra", () => {
    expect(rankTeam([])).toEqual([]);
  });
});

describe("projectDayTotal", () => {
  it("faz a regra de três do ritmo", () => {
    // Metade do expediente, 200 faturados: neste ritmo, 400.
    expect(projectDayTotal({ achieved: 200, minutesElapsed: 300, minutesTotal: 600 })).toBe(400);
  });

  it("não projeta nos primeiros minutos", () => {
    // Um atendimento caro às 8h05 projetaria um dia irreal.
    expect(projectDayTotal({ achieved: 200, minutesElapsed: 10, minutesTotal: 600 })).toBeNull();
  });

  it("não projeta depois do expediente", () => {
    expect(projectDayTotal({ achieved: 500, minutesElapsed: 600, minutesTotal: 600 })).toBeNull();
    expect(projectDayTotal({ achieved: 500, minutesElapsed: 900, minutesTotal: 600 })).toBeNull();
  });

  it("expediente sem duração não projeta", () => {
    expect(projectDayTotal({ achieved: 100, minutesElapsed: 60, minutesTotal: 0 })).toBeNull();
  });
});
