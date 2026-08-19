/**
 * Radar de clientes que passaram do próprio ciclo de retorno.
 *
 * ─── A ideia ─────────────────────────────────────────────────────────────────
 *
 * Cada cliente tem um ritmo próprio. O João corta a cada 18 dias, a Ana faz as
 * unhas a cada 21. Quando o João chega no dia 40 sem agendar, ou ele esqueceu
 * ou foi para o concorrente — e nos dois casos há uma janela curta em que uma
 * mensagem funciona. Depois disso ele já tem barbeiro novo.
 *
 * ─── Mediana, não média ──────────────────────────────────────────────────────
 *
 * O intervalo típico é calculado por mediana. Uma única viagem de dois meses
 * puxa a média para cima o suficiente para o cliente nunca mais parecer
 * atrasado — o sinal desaparece justamente em quem tem histórico longo, que é
 * quem mais vale reter. A mediana ignora o outlier.
 *
 * ─── Não precisa de IA ───────────────────────────────────────────────────────
 *
 * O documento original propunha um motor de IA para isto. É a mediana de uma
 * lista de números. A IA, se entrar, escreve o texto da mensagem — não decide
 * quem recebe nem quanto de desconto.
 *
 * A agregação (mediana e última visita) é feita em SQL, em
 * `src/server/queries/win-back.ts`. Aqui fica só a classificação, que é onde
 * mora o julgamento de produto — e é o que o dono vê na tela.
 */

export type WinBackStatus = "UNKNOWN" | "ACTIVE" | "DUE" | "OVERDUE" | "LOST";

/**
 * Visitas concluídas necessárias para haver ciclo.
 *
 * Três visitas dão dois intervalos. Com duas visitas há um intervalo só, e uma
 * amostra de um não é ritmo — é coincidência. Chamar de "atrasado" quem tem uma
 * amostra dessas gera mensagem errada para cliente que nunca teve rotina.
 */
export const MIN_VISITS_FOR_CYCLE = 3;

/**
 * Multiplicadores do ciclo que separam as faixas.
 *
 * Passar do ciclo em alguns dias é ruído normal — feriado, semana cheia. Só a
 * partir de meio ciclo de atraso o padrão virou desvio.
 *
 * O teto existe porque disparar oferta para quem sumiu há dois anos não é
 * resgate: é e-mail frio, com taxa de resposta baixa e risco real de marcação
 * como spam, que degrada a entrega de TODOS os e-mails da empresa — inclusive
 * as confirmações de agendamento, que precisam chegar.
 */
export const DUE_FACTOR = 1.0;
export const OVERDUE_FACTOR = 1.5;
export const LOST_FACTOR = 4.0;

export type WinBackInput = {
  /** Mediana dos intervalos entre visitas, em dias. `null` = sem ciclo ainda. */
  cycleDays: number | null;
  /** Dias desde a última visita concluída. */
  daysSinceLast: number;
  completedVisits: number;
};

export type WinBackAssessment = {
  status: WinBackStatus;
  /** Dias além do ciclo. Negativo quando o cliente ainda está dentro dele. */
  overdueBy: number;
  /** Frase pronta para a linha da tabela. */
  reason: string;
};

export function assessWinBack(input: WinBackInput): WinBackAssessment {
  const { cycleDays, daysSinceLast, completedVisits } = input;

  if (completedVisits < MIN_VISITS_FOR_CYCLE || cycleDays === null || cycleDays <= 0) {
    return {
      status: "UNKNOWN",
      overdueBy: 0,
      reason:
        completedVisits === 0
          ? "Nenhuma visita concluída"
          : `${completedVisits} visita${completedVisits === 1 ? "" : "s"} — ainda sem ritmo definido`,
    };
  }

  const overdueBy = daysSinceLast - cycleDays;

  if (daysSinceLast <= cycleDays * DUE_FACTOR) {
    return {
      status: "ACTIVE",
      overdueBy,
      reason: `Volta a cada ${cycleDays} dias — dentro do ritmo`,
    };
  }

  if (daysSinceLast <= cycleDays * OVERDUE_FACTOR) {
    return {
      status: "DUE",
      overdueBy,
      reason: `${daysSinceLast} dias desde a última visita, ciclo de ${cycleDays}`,
    };
  }

  if (daysSinceLast <= cycleDays * LOST_FACTOR) {
    return {
      status: "OVERDUE",
      overdueBy,
      reason: `${overdueBy} dias além do ciclo de ${cycleDays}`,
    };
  }

  return {
    status: "LOST",
    overdueBy,
    reason: `Sem voltar há ${daysSinceLast} dias — mais de ${LOST_FACTOR}× o ciclo`,
  };
}

/**
 * Faixas que valem uma campanha de resgate.
 *
 * `DUE` fica de fora: o cliente está atrasado em dias, não em semanas, e
 * mandar oferta para quem provavelmente já ia voltar é dar desconto de graça
 * — a empresa paga para adiantar em três dias uma visita que aconteceria.
 *
 * `LOST` também fica de fora do padrão, mas continua visível e selecionável:
 * a decisão de escrever para quem sumiu há muito tempo é do dono, que conhece
 * o cliente. O que não pode é o sistema fazer isso sozinho.
 */
export const CAMPAIGN_DEFAULT_STATUSES: WinBackStatus[] = ["OVERDUE"];

export const STATUS_LABELS: Record<WinBackStatus, string> = {
  UNKNOWN: "Sem ritmo",
  ACTIVE: "Em dia",
  DUE: "Chegando a hora",
  OVERDUE: "Atrasado",
  LOST: "Provavelmente perdido",
};

/** Vocabulário do `StatusBadge`, para a tela não traduzir tom em variante. */
export const STATUS_VARIANTS: Record<
  WinBackStatus,
  "neutral" | "success" | "info" | "warning" | "danger"
> = {
  UNKNOWN: "neutral",
  ACTIVE: "success",
  DUE: "info",
  OVERDUE: "warning",
  LOST: "danger",
};
