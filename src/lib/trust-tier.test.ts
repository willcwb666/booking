import { describe, expect, it } from "vitest";
import {
  assessTrust,
  depositForTier,
  resolveDeposit,
  NO_SHOW_WINDOW_DAYS,
  TRUSTED_MIN_COMPLETED,
} from "./trust-tier";

const base = {
  completedBookings: 0,
  recentNoShows: 0,
  totalNoShows: 0,
  maxAllowedNoShows: 2,
};

describe("assessTrust", () => {
  it("trata quem nunca agendou como neutro, não como risco", () => {
    // Cliente novo não é suspeito — é só desconhecido. Colocá-lo em AT_RISK
    // faria todo primeiro agendamento pedir sinal, que é o atrito que a
    // funcionalidade existe para reduzir.
    const r = assessTrust(base);
    expect(r.tier).toBe("NEUTRAL");
    expect(r.reason).toMatch(/Primeiro agendamento/);
  });

  it("promove a confiável a partir do mínimo de atendimentos concluídos", () => {
    expect(assessTrust({ ...base, completedBookings: TRUSTED_MIN_COMPLETED - 1 }).tier).toBe(
      "NEUTRAL"
    );
    expect(assessTrust({ ...base, completedBookings: TRUSTED_MIN_COMPLETED }).tier).toBe(
      "TRUSTED"
    );
  });

  it("falta recente vence histórico bom", () => {
    // O ponto da janela: vinte atendimentos não apagam a falta de ontem.
    const r = assessTrust({ ...base, completedBookings: 20, recentNoShows: 1, totalNoShows: 1 });
    expect(r.tier).toBe("AT_RISK");
  });

  it("falta antiga não pesa — a janela expira", () => {
    // Mesma pessoa do teste acima, só que a falta caiu fora da janela.
    const r = assessTrust({ ...base, completedBookings: 20, recentNoShows: 0, totalNoShows: 1 });
    expect(r.tier).toBe("TRUSTED");
  });

  it("bloqueia acima do limite da empresa e o bloqueio vence tudo", () => {
    const r = assessTrust({
      ...base,
      completedBookings: 50,
      recentNoShows: 0,
      totalNoShows: 3,
      maxAllowedNoShows: 2,
    });
    expect(r.tier).toBe("BLOCKED");
    expect(r.reason).toContain("3");
  });

  it("não bloqueia exatamente no limite — só acima dele", () => {
    const r = assessTrust({ ...base, totalNoShows: 2, maxAllowedNoShows: 2 });
    expect(r.tier).not.toBe("BLOCKED");
  });

  it("limite zero desliga o bloqueio em vez de bloquear todo mundo", () => {
    // `maxAllowedNoShows: 0` lido como "nenhuma falta permitida" bloquearia
    // qualquer um com uma falta na história inteira. Zero significa desligado.
    const r = assessTrust({ ...base, totalNoShows: 9, maxAllowedNoShows: 0 });
    expect(r.tier).not.toBe("BLOCKED");
  });

  it("cita a janela na explicação, para a frase caber na conversa", () => {
    const r = assessTrust({ ...base, recentNoShows: 2, totalNoShows: 2 });
    expect(r.reason).toContain(String(NO_SHOW_WINDOW_DAYS));
    expect(r.reason).toContain("2 faltas");
  });
});

describe("depositForTier", () => {
  it("isenta confiável e neutro", () => {
    expect(depositForTier("TRUSTED", 30).percentage).toBe(0);
    expect(depositForTier("NEUTRAL", 30).percentage).toBe(0);
  });

  it("aplica o percentual da empresa em risco — não inventa valor", () => {
    expect(depositForTier("AT_RISK", 30).percentage).toBe(30);
    expect(depositForTier("AT_RISK", 50).percentage).toBe(50);
  });

  it("bloqueado paga integral", () => {
    expect(depositForTier("BLOCKED", 30).percentage).toBe(100);
  });

  it("limita percentuais fora da faixa em vez de propagar lixo ao Stripe", () => {
    expect(depositForTier("AT_RISK", 150).percentage).toBe(100);
    expect(depositForTier("AT_RISK", -10).percentage).toBe(0);
    expect(depositForTier("AT_RISK", Number.NaN).percentage).toBe(0);
  });
});

describe("resolveDeposit", () => {
  const trusted = assessTrust({ ...base, completedBookings: 10 });
  const atRisk = assessTrust({ ...base, recentNoShows: 1, totalNoShows: 1 });

  it("com a regra dinâmica desligada, mantém exatamente o comportamento antigo", () => {
    // Nenhuma empresa deve ter o valor cobrado alterado só por atualizar o
    // sistema. A troca é do dono.
    expect(
      resolveDeposit({
        dynamicDeposit: false,
        requireDeposit: true,
        depositPercentage: 30,
        trust: trusted,
      }).percentage
    ).toBe(30);

    expect(
      resolveDeposit({
        dynamicDeposit: false,
        requireDeposit: false,
        depositPercentage: 30,
        trust: atRisk,
      }).percentage
    ).toBe(0);
  });

  it("com a regra ligada, a faixa manda e `requireDeposit` deixa de decidir", () => {
    expect(
      resolveDeposit({
        dynamicDeposit: true,
        requireDeposit: true,
        depositPercentage: 30,
        trust: trusted,
      }).percentage
    ).toBe(0);

    expect(
      resolveDeposit({
        dynamicDeposit: true,
        requireDeposit: false,
        depositPercentage: 30,
        trust: atRisk,
      }).percentage
    ).toBe(30);
  });

  it("dá um motivo quando cobra e nenhum quando isenta", () => {
    const charged = resolveDeposit({
      dynamicDeposit: true,
      requireDeposit: false,
      depositPercentage: 30,
      trust: atRisk,
    });
    expect(charged.reason).not.toBe("");

    const free = resolveDeposit({
      dynamicDeposit: true,
      requireDeposit: true,
      depositPercentage: 30,
      trust: trusted,
    });
    expect(free.reason).toBe("");
  });
});
