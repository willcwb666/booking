import "server-only";

export type SubscriptionState = "active" | "grace" | "blocked";

export type SubscriptionAccess = {
  state: SubscriptionState;
  /** Data em que a assinatura venceu (subscriptionPeriodEnd) */
  overdueSince: Date | null;
  /** Data a partir da qual o acesso é bloqueado (venceu + tolerância) */
  blockDate: Date | null;
  /** Dias até a renovação (negativo se já venceu) */
  daysUntilRenewal: number | null;
  /** Dias até o bloqueio (relevante durante a tolerância) */
  daysUntilBlock: number | null;
};

const MS_DAY = 1000 * 60 * 60 * 24;
// Enquanto a assinatura está nesses estados no Stripe, o acesso é normal
const OK_STATUSES = new Set(["active", "trialing"]);

const ACTIVE: SubscriptionAccess = {
  state: "active",
  overdueSince: null,
  blockDate: null,
  daysUntilRenewal: null,
  daysUntilBlock: null,
};

/**
 * Regra de dunning (2 estágios) com tolerância global (`gracePeriodDays`):
 *  - em dia → active
 *  - vencido, dentro da tolerância → grace (banner, acesso liberado)
 *  - vencido, fora da tolerância e sem status ativo → blocked (redireciona p/ pagamento)
 *
 * Nunca bloqueia quando não há assinatura conhecida (plano grátis / nunca assinou):
 * `subscriptionPeriodEnd` nulo ⇒ active.
 */
export function evaluateSubscriptionAccess(input: {
  subscriptionStatus: string | null;
  subscriptionPeriodEnd: Date | null;
  gracePeriodDays: number;
  now?: Date;
}): SubscriptionAccess {
  const now = input.now ?? new Date();
  const periodEnd = input.subscriptionPeriodEnd;

  // Sem término conhecido → nunca bloqueia (grátis / sem assinatura)
  if (!periodEnd) return ACTIVE;

  const daysUntilRenewal = Math.ceil((periodEnd.getTime() - now.getTime()) / MS_DAY);
  const blockDate = new Date(periodEnd.getTime() + Math.max(0, input.gracePeriodDays) * MS_DAY);
  const daysUntilBlock = Math.ceil((blockDate.getTime() - now.getTime()) / MS_DAY);

  // Ainda dentro do período pago
  if (now <= periodEnd) {
    return { state: "active", overdueSince: null, blockDate, daysUntilRenewal, daysUntilBlock };
  }

  // Venceu, mas o Stripe voltou a reportar ativo/trial → libera
  if (input.subscriptionStatus && OK_STATUSES.has(input.subscriptionStatus)) {
    return ACTIVE;
  }

  // Venceu, dentro da tolerância → aviso; fora → bloqueio
  const state: SubscriptionState = now < blockDate ? "grace" : "blocked";
  return { state, overdueSince: periodEnd, blockDate, daysUntilRenewal, daysUntilBlock };
}
