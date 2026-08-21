import { describe, expect, it } from "vitest";
import { minutesIntoDayInTimezone, slotAlreadyPassed, todayInTimezone } from "./company-date";

/**
 * O defeito que fazia a agenda de AMANHÃ aparecer quase vazia.
 *
 * A grade decidia "este horário já passou" com duas fontes de tempo
 * diferentes: a data em UTC e a hora do relógio LOCAL do servidor. Enquanto o
 * servidor e a empresa estavam no mesmo dia, as duas coincidiam e nada
 * aparecia. Depois que o UTC virava — 18h em Denver, 21h em São Paulo — a data
 * passava a ser a de amanhã e a hora continuava sendo a de hoje.
 *
 * Resultado: o filtro rodava sobre a grade do dia seguinte e escondia tudo
 * antes da hora atual. Toda noite, o cliente que abrisse a página via a manhã
 * e a tarde de amanhã sumidas, e concluía que o salão estava lotado.
 *
 * Não dava para pegar com o relógio real: o defeito só existe em parte do dia.
 * Por isso `now` é injetável.
 */

/** 21:30 em Denver (UTC−6) — em UTC já é o dia seguinte, 03:30. */
const NOITE_EM_DENVER = new Date("2026-08-21T03:30:00Z");
const DENVER = "America/Denver";

describe("data e hora no fuso da empresa", () => {
  it("o dia da empresa não é o dia do servidor", () => {
    // A premissa do defeito, fixada: se isto deixar de valer, os casos abaixo
    // param de significar o que significam.
    expect(todayInTimezone(DENVER, NOITE_EM_DENVER)).toBe("2026-08-20");
    expect(NOITE_EM_DENVER.toISOString().slice(0, 10)).toBe("2026-08-21");
  });

  it("minutos decorridos seguem o relógio da empresa", () => {
    expect(minutesIntoDayInTimezone(DENVER, NOITE_EM_DENVER)).toBe(21 * 60 + 30);
  });

  describe("slotAlreadyPassed", () => {
    it("NÃO esconde a manhã de amanhã", () => {
      // O caso exato do defeito: 09:00 do dia 21, consultado às 21:30 do dia
      // 20 em Denver. Com a data lida em UTC, "21" era "hoje" e 09:00 <= 21:30
      // escondia o horário.
      expect(
        slotAlreadyPassed({
          slotDate: "2026-08-21",
          slotStartTime: "09:00",
          timezone: DENVER,
          now: NOITE_EM_DENVER,
        })
      ).toBe(false);
    });

    it("esconde o que já passou HOJE", () => {
      // Controle positivo: sem ele, a correção poderia ser "nunca esconder
      // nada", e a página passaria a oferecer horário que já foi.
      expect(
        slotAlreadyPassed({
          slotDate: "2026-08-20",
          slotStartTime: "09:00",
          timezone: DENVER,
          now: NOITE_EM_DENVER,
        })
      ).toBe(true);
    });

    it("mantém o que ainda vem hoje", () => {
      expect(
        slotAlreadyPassed({
          slotDate: "2026-08-20",
          slotStartTime: "22:00",
          timezone: DENVER,
          now: NOITE_EM_DENVER,
        })
      ).toBe(false);
    });

    it("o horário que começa agora conta como passado", () => {
      // Vender o slot das 21:30 às 21:30 é vender um atendimento que já
      // deveria ter começado.
      expect(
        slotAlreadyPassed({
          slotDate: "2026-08-20",
          slotStartTime: "21:30",
          timezone: DENVER,
          now: NOITE_EM_DENVER,
        })
      ).toBe(true);
    });

    it("data passada não depende da hora", () => {
      expect(
        slotAlreadyPassed({
          slotDate: "2026-08-19",
          slotStartTime: "23:00",
          timezone: DENVER,
          now: NOITE_EM_DENVER,
        })
      ).toBe(false);
    });

    it("funciona igual no fuso brasileiro", () => {
      // 21:30 em São Paulo (UTC−3) — em UTC também já virou.
      const noiteEmSP = new Date("2026-08-21T00:30:00Z");
      expect(
        slotAlreadyPassed({
          slotDate: "2026-08-21",
          slotStartTime: "08:00",
          timezone: "America/Sao_Paulo",
          now: noiteEmSP,
        })
      ).toBe(false);
    });
  });
});
