/**
 * Faixa de confiança do cliente e o sinal (deposit) que ela implica.
 *
 * O problema que isto resolve: hoje `requireDeposit` é uma chave global da
 * empresa. Ou cobra sinal de todo mundo — e o cliente de dez anos é tratado
 * como desconhecido, o que ofende e gera atrito — ou não cobra de ninguém, e a
 * falta do cliente novo sai de graça.
 *
 * ─── Por que faixas e não um score ───────────────────────────────────────────
 *
 * A proposta original era um "score de confiabilidade de 0 a 100" calculado por
 * IA. Um número opaco que decide cobrar dinheiro de alguém é um problema de
 * atendimento antes de ser um problema técnico: o dono não consegue explicar ao
 * cliente por que ele caiu de 71 para 64, e um critério automatizado não
 * explicável que restringe acesso a serviço é exposição regulatória
 * desnecessária — sobretudo no mercado americano.
 *
 * Quatro faixas derivadas de contadores que o dono já vê na ficha do cliente
 * fazem o mesmo trabalho, cabem numa frase ("você faltou duas vezes nos últimos
 * seis meses") e sobrevivem a uma discussão.
 *
 * Funções puras, sem I/O — os contadores chegam prontos de
 * `src/server/queries/customer-trust.ts`.
 */

export type TrustTier = "TRUSTED" | "NEUTRAL" | "AT_RISK" | "BLOCKED";

/**
 * Janela em que uma falta ainda pesa.
 *
 * Sem recorte, `noShowCount` é uma condenação perpétua: quem faltou uma vez em
 * 2024 seguiria pagando sinal em 2030. Seis meses é tempo suficiente para o
 * padrão se repetir se for real, e curto o bastante para o cliente perceber que
 * voltou ao normal — o que é justamente o incentivo que a regra quer criar.
 */
export const NO_SHOW_WINDOW_DAYS = 180;

/** Atendimentos concluídos a partir dos quais o cliente é considerado fiel. */
export const TRUSTED_MIN_COMPLETED = 3;

export type TrustInput = {
  /** Atendimentos concluídos nesta empresa. */
  completedBookings: number;
  /** Faltas dentro de `NO_SHOW_WINDOW_DAYS`. */
  recentNoShows: number;
  /** Faltas em toda a história — usado só para o limite de bloqueio. */
  totalNoShows: number;
  /** `Company.maxAllowedNoShows`. */
  maxAllowedNoShows: number;
};

export type TrustAssessment = {
  tier: TrustTier;
  /** Frase pronta para a ficha do cliente e para o checkout. */
  reason: string;
};

/**
 * Faixa do cliente, avaliada da pior para a melhor.
 *
 * A ordem importa: bloqueio vence tudo, e falta recente vence histórico bom —
 * um cliente com vinte atendimentos que faltou ontem ainda é risco hoje.
 */
export function assessTrust(input: TrustInput): TrustAssessment {
  const { completedBookings, recentNoShows, totalNoShows, maxAllowedNoShows } = input;

  if (maxAllowedNoShows > 0 && totalNoShows > maxAllowedNoShows) {
    return {
      tier: "BLOCKED",
      reason: `${totalNoShows} faltas registradas, acima do limite de ${maxAllowedNoShows} da empresa`,
    };
  }

  if (recentNoShows > 0) {
    return {
      tier: "AT_RISK",
      reason:
        recentNoShows === 1
          ? `1 falta nos últimos ${NO_SHOW_WINDOW_DAYS} dias`
          : `${recentNoShows} faltas nos últimos ${NO_SHOW_WINDOW_DAYS} dias`,
    };
  }

  if (completedBookings >= TRUSTED_MIN_COMPLETED) {
    return {
      tier: "TRUSTED",
      reason: `${completedBookings} atendimentos concluídos, nenhuma falta recente`,
    };
  }

  return {
    tier: "NEUTRAL",
    reason:
      completedBookings === 0
        ? "Primeiro agendamento nesta empresa"
        : `${completedBookings} atendimento${completedBookings === 1 ? "" : "s"} concluído${completedBookings === 1 ? "" : "s"} — histórico ainda curto`,
  };
}

export type DepositPolicy = {
  /** Percentual do valor devido a cobrar como sinal. 0 = nenhum. */
  percentage: number;
  /** Motivo exibido ao cliente no checkout. Vazio quando não há sinal. */
  reason: string;
};

/**
 * Sinal correspondente a uma faixa.
 *
 * `basePercentage` é o `depositPercentage` que a empresa já configurou — a
 * regra dinâmica decide *a quem* aplicar, não inventa um valor novo. Bloqueado
 * paga integral: nesse ponto não é mais garantia, é pré-pagamento.
 */
export function depositForTier(tier: TrustTier, basePercentage: number): DepositPolicy {
  switch (tier) {
    case "TRUSTED":
      return { percentage: 0, reason: "" };
    case "NEUTRAL":
      return { percentage: 0, reason: "" };
    case "AT_RISK":
      return {
        percentage: clampPercent(basePercentage),
        reason: "Sinal para confirmar a reserva",
      };
    case "BLOCKED":
      return { percentage: 100, reason: "Pagamento integral antecipado" };
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Decisão final de sinal para um agendamento.
 *
 * Com `dynamicDeposit` desligado o comportamento é exatamente o de antes — a
 * chave global da empresa manda, e a faixa do cliente é ignorada. Isso é
 * deliberado: ligar a regra dinâmica muda quanto os clientes pagam, e essa
 * troca é do dono, não um efeito colateral de atualizar o sistema.
 */
export function resolveDeposit(params: {
  dynamicDeposit: boolean;
  requireDeposit: boolean;
  depositPercentage: number;
  trust: TrustAssessment;
}): DepositPolicy {
  const { dynamicDeposit, requireDeposit, depositPercentage, trust } = params;

  if (!dynamicDeposit) {
    return requireDeposit
      ? {
          percentage: clampPercent(depositPercentage),
          reason: "Sinal para confirmar a reserva",
        }
      : { percentage: 0, reason: "" };
  }

  return depositForTier(trust.tier, depositPercentage);
}

/** Rótulos para a ficha do cliente. */
export const TIER_LABELS: Record<TrustTier, string> = {
  TRUSTED: "Confiável",
  NEUTRAL: "Neutro",
  AT_RISK: "Risco",
  BLOCKED: "Bloqueado",
};

/** Tom visual de cada faixa, no vocabulário do design system. */
export const TIER_TONES: Record<TrustTier, "success" | "navy" | "warning" | "danger"> = {
  TRUSTED: "success",
  NEUTRAL: "navy",
  AT_RISK: "warning",
  BLOCKED: "danger",
};
