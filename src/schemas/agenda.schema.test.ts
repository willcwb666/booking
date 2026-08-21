import { describe, expect, it } from "vitest";
import { makeAgendaSchema } from "./agenda.schema";

/**
 * Os dois defeitos da validação de agenda.
 *
 * 1. "Início não pode ser no passado" comparava com o dia do SERVIDOR, em UTC.
 *    Em fuso negativo o servidor vira o dia antes do salão — às 18h de Denver
 *    já é o dia seguinte em UTC — e o dono que tentasse criar uma agenda
 *    começando HOJE era recusado. A trava bloqueava o uso legítimo, que é a
 *    direção pior de errar.
 *
 * 2. A mesma regra rodava na EDIÇÃO. Uma agenda que já começou tem, por
 *    definição, data de início no passado; então alterar o horário de
 *    funcionamento de uma agenda em uso era simplesmente impossível, recusado
 *    por um campo que o dono nem estava mexendo.
 */

/** Data no fuso pedido, com deslocamento em dias. */
function diaEm(timezone: string, offset = 0): string {
  const base = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(base);
}

const valido = {
  name: "Principal",
  workingDays: [1, 2, 3],
  startTime: "09:00",
  endTime: "18:00",
  intervalMinutes: 30,
  professionalIds: [],
};

describe("validação da agenda", () => {
  const DENVER = "America/Denver";

  it("aceita início HOJE no fuso da empresa", () => {
    // O caso que o UTC quebrava: enquanto Denver ainda está no dia 20, UTC já
    // virou 21, e "hoje" era lido como passado.
    const r = makeAgendaSchema({ timezone: DENVER }).safeParse({
      ...valido,
      startDate: diaEm(DENVER, 0),
    });
    expect(r.success).toBe(true);
  });

  it("recusa início ONTEM", () => {
    // Controle positivo da mesma regra: sem ele, o teste acima passaria mesmo
    // que a validação de data tivesse sumido por completo.
    const r = makeAgendaSchema({ timezone: DENVER }).safeParse({
      ...valido,
      startDate: diaEm(DENVER, -1),
    });
    expect(r.success).toBe(false);
  });

  it("aceita manter uma data de início que já passou, na edição", () => {
    const jaComecou = diaEm(DENVER, -30);
    const r = makeAgendaSchema({
      timezone: DENVER,
      currentStartDate: jaComecou,
    }).safeParse({ ...valido, startDate: jaComecou });

    expect(r.success).toBe(true);
  });

  it("mesmo na edição, não deixa MOVER o início para o passado", () => {
    const r = makeAgendaSchema({
      timezone: DENVER,
      currentStartDate: diaEm(DENVER, -30),
    }).safeParse({ ...valido, startDate: diaEm(DENVER, -10) });

    expect(r.success).toBe(false);
  });

  it("continua exigindo término depois do início", () => {
    const r = makeAgendaSchema({ timezone: DENVER }).safeParse({
      ...valido,
      startDate: diaEm(DENVER, 0),
      startTime: "18:00",
      endTime: "09:00",
    });
    expect(r.success).toBe(false);
  });

  it("continua exigindo ao menos um dia da semana", () => {
    const r = makeAgendaSchema({ timezone: DENVER }).safeParse({
      ...valido,
      startDate: diaEm(DENVER, 0),
      workingDays: [],
    });
    expect(r.success).toBe(false);
  });
});
