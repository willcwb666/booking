import { describe, expect, it } from "vitest";
import {
  assessWinBack,
  CAMPAIGN_DEFAULT_STATUSES,
  LOST_FACTOR,
  MIN_VISITS_FOR_CYCLE,
  OVERDUE_FACTOR,
} from "./win-back";

/** Cliente com ciclo de 20 dias e histórico suficiente. */
const base = { cycleDays: 20, completedVisits: 8 };

describe("assessWinBack", () => {
  it("cliente sem visita nenhuma não tem ritmo", () => {
    const r = assessWinBack({ cycleDays: null, daysSinceLast: 0, completedVisits: 0 });
    expect(r.status).toBe("UNKNOWN");
    expect(r.reason).toMatch(/Nenhuma visita/);
  });

  it("duas visitas ainda não formam ciclo", () => {
    // Um intervalo só é coincidência, não ritmo. Chamar isso de "atrasado"
    // manda mensagem errada para quem nunca teve rotina.
    const r = assessWinBack({
      cycleDays: 30,
      daysSinceLast: 200,
      completedVisits: MIN_VISITS_FOR_CYCLE - 1,
    });
    expect(r.status).toBe("UNKNOWN");
  });

  it("a partir do mínimo de visitas o ciclo passa a valer", () => {
    const r = assessWinBack({
      cycleDays: 30,
      daysSinceLast: 200,
      completedVisits: MIN_VISITS_FOR_CYCLE,
    });
    expect(r.status).not.toBe("UNKNOWN");
  });

  it("dentro do ciclo está em dia", () => {
    expect(assessWinBack({ ...base, daysSinceLast: 5 }).status).toBe("ACTIVE");
    expect(assessWinBack({ ...base, daysSinceLast: 20 }).status).toBe("ACTIVE");
  });

  it("passar do ciclo por poucos dias é só 'chegando a hora'", () => {
    // Ruído normal: feriado, semana cheia. Não é desvio de padrão ainda.
    expect(assessWinBack({ ...base, daysSinceLast: 21 }).status).toBe("DUE");
    expect(assessWinBack({ ...base, daysSinceLast: 30 }).status).toBe("DUE");
  });

  it("meio ciclo de atraso é a janela de resgate", () => {
    expect(assessWinBack({ ...base, daysSinceLast: 31 }).status).toBe("OVERDUE");
    expect(assessWinBack({ ...base, daysSinceLast: 80 }).status).toBe("OVERDUE");
  });

  it("muito além do ciclo deixa de ser resgate", () => {
    expect(assessWinBack({ ...base, daysSinceLast: 81 }).status).toBe("LOST");
  });

  it("as fronteiras batem com os multiplicadores declarados", () => {
    // Fixa a relação entre as constantes e o comportamento: mexer num
    // multiplicador sem querer quebra aqui.
    const cycle = 10;
    const onOverdueEdge = cycle * OVERDUE_FACTOR;
    const onLostEdge = cycle * LOST_FACTOR;

    expect(assessWinBack({ cycleDays: cycle, daysSinceLast: onOverdueEdge, completedVisits: 5 }).status).toBe("DUE");
    expect(assessWinBack({ cycleDays: cycle, daysSinceLast: onOverdueEdge + 1, completedVisits: 5 }).status).toBe("OVERDUE");
    expect(assessWinBack({ cycleDays: cycle, daysSinceLast: onLostEdge, completedVisits: 5 }).status).toBe("OVERDUE");
    expect(assessWinBack({ cycleDays: cycle, daysSinceLast: onLostEdge + 1, completedVisits: 5 }).status).toBe("LOST");
  });

  it("ciclo zero ou negativo não vira divisão maluca", () => {
    // Aconteceria com duas visitas no mesmo dia. Sem guarda, `daysSinceLast <=
    // 0` classificaria todo mundo como perdido.
    expect(assessWinBack({ cycleDays: 0, daysSinceLast: 50, completedVisits: 9 }).status).toBe("UNKNOWN");
    expect(assessWinBack({ cycleDays: -3, daysSinceLast: 50, completedVisits: 9 }).status).toBe("UNKNOWN");
  });

  it("overdueBy é negativo para quem está dentro do ciclo", () => {
    // A tela ordena por este número; se ele fosse zerado no caso ACTIVE, quem
    // está em dia apareceria junto de quem acabou de estourar o ciclo.
    expect(assessWinBack({ ...base, daysSinceLast: 5 }).overdueBy).toBe(-15);
    expect(assessWinBack({ ...base, daysSinceLast: 35 }).overdueBy).toBe(15);
  });

  it("a explicação sempre cita números concretos", () => {
    // O dono vai repetir isso para o cliente no WhatsApp. "Cliente em risco"
    // não serve; "45 dias além do ciclo de 20" serve.
    for (const days of [5, 25, 45, 300]) {
      const r = assessWinBack({ ...base, daysSinceLast: days });
      expect(r.reason).toMatch(/\d/);
    }
  });
});

describe("CAMPAIGN_DEFAULT_STATUSES", () => {
  it("não inclui quem só está chegando a hora", () => {
    // Dar desconto para quem provavelmente já ia voltar é a empresa pagando
    // para adiantar em três dias uma visita que aconteceria de graça.
    expect(CAMPAIGN_DEFAULT_STATUSES).not.toContain("DUE");
    expect(CAMPAIGN_DEFAULT_STATUSES).not.toContain("ACTIVE");
  });

  it("não inclui quem provavelmente já foi embora", () => {
    // E-mail frio para quem sumiu há muito tempo tem resposta baixa e risco de
    // marcação como spam, que degrada a entrega das confirmações também.
    expect(CAMPAIGN_DEFAULT_STATUSES).not.toContain("LOST");
  });

  it("inclui a janela de resgate", () => {
    expect(CAMPAIGN_DEFAULT_STATUSES).toContain("OVERDUE");
  });
});
