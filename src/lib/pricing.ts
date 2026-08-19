/**
 * Cálculos monetários dos fluxos de agendamento: comissão de profissional,
 * sinal de reserva (deposit) e reembolso em cancelamento.
 *
 * Funções puras e determinísticas (sem I/O). Centralizam a matemática do
 * dinheiro numa única fonte de verdade, coberta por `pricing.test.ts`. Como
 * não importam `server-only`, podem ser usadas tanto em Server Actions quanto
 * em componentes de UI (ex.: exibir o sinal no checkout).
 */

/** Converte um valor na unidade principal (ex.: reais) para centavos do Stripe. */
export function toStripeCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Arredonda um valor monetário para 2 casas decimais. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type CommissionResult = {
  /** Valor devido ao profissional. */
  commission: number;
  /** Valor retido pela empresa (total − comissão). */
  companyRetained: number;
};

/** Comissão do profissional sobre o total do agendamento. */
export function calculateCommission(total: number, commissionPercentage: number): CommissionResult {
  const rate = commissionPercentage > 0 ? commissionPercentage / 100 : 0;
  const commission = total * rate;
  return { commission, companyRetained: total - commission };
}

export type DepositResult = {
  /** Sinal cobrado na reserva. */
  deposit: number;
  /** Valor restante a pagar depois do sinal. */
  remaining: number;
};

/** Sinal de reserva (percentual do total) e o valor restante. */
export function calculateDeposit(total: number, depositPercentage: number): DepositResult {
  const deposit = (total * depositPercentage) / 100;
  return { deposit, remaining: total - deposit };
}

/**
 * Valor efetivamente cobrado online ao criar o agendamento: apenas o sinal
 * quando a empresa o exige, senão o total. Arredondado a 2 casas decimais
 * (exigência de PIX/Stripe). O total do orçamento permanece o valor cheio — o
 * restante é pago no local.
 */
export function resolveOnlineChargeAmount(params: {
  total: number;
  requireDeposit: boolean;
  depositPercentage: number;
}): number {
  const { total, requireDeposit, depositPercentage } = params;
  const raw = requireDeposit ? calculateDeposit(total, depositPercentage).deposit : total;
  return Math.round(raw * 100) / 100;
}

export type CancellationRefundResult = {
  /** Valor a reembolsar ao cliente. */
  refundAmount: number;
  /** Taxa de cancelamento efetivamente retida. */
  feeApplied: number;
  /** true quando é reembolso integral (Stripe: refund sem `amount`). */
  isFullRefund: boolean;
};

/**
 * Reembolso ao cancelar um agendamento já pago.
 *
 * Cancelamento tardio (abaixo da antecedência mínima) com taxa configurada
 * retém a taxa e devolve o restante; qualquer outro caso é reembolso integral.
 * A taxa nunca excede o total (piso de reembolso = 0).
 */
export function calculateCancellationRefund(params: {
  total: number;
  cancellationFee: number;
  isLateCancellation: boolean;
}): CancellationRefundResult {
  const { total, cancellationFee, isLateCancellation } = params;

  if (isLateCancellation && cancellationFee > 0) {
    const refundAmount = Math.max(0, total - cancellationFee);
    return { refundAmount, feeApplied: Math.min(cancellationFee, total), isFullRefund: false };
  }

  return { refundAmount: total, feeApplied: 0, isFullRefund: true };
}

export type BookingChargeBreakdown = {
  /** Valor devido pelo cliente após cobertura de plano, desconto e gift card. */
  amountDue: number;
  /** Valor a cobrar online agora (sinal ou total de amountDue). 0 = nada a cobrar. */
  onlineCharge: number;
};

/**
 * Cobrança final de um agendamento, combinando (nesta ordem):
 * 1. Cobertura total por plano/pacote (`membershipCovered`) → agendamento gratuito;
 * 2. Desconto de horário ocioso (`offPeakDiscount`, já em valor);
 * 3. Desconto percentual de membro (`membershipDiscount`, já em valor);
 * 4. Abatimento por gift card (`giftCardDebit`, valor já debitado);
 * 5. Sinal (deposit), se a empresa exigir, sobre o valor devido.
 *
 * O desconto de horário vem ANTES do gift card de propósito: o vale abate o
 * que o cliente realmente deve, e aplicá-lo antes do desconto consumiria saldo
 * do vale para pagar uma parte que a empresa ia perdoar de qualquer jeito.
 *
 * Os valores de cobertura/desconto/gift já vêm resolvidos (e debitados
 * atomicamente no banco); esta função apenas deriva o que o cliente paga.
 */
export function computeBookingCharge(params: {
  total: number;
  membershipCovered: boolean;
  membershipDiscount: number;
  giftCardDebit: number;
  requireDeposit: boolean;
  depositPercentage: number;
  /** Desconto de janela de horário ocioso, já em valor. */
  offPeakDiscount?: number;
}): BookingChargeBreakdown {
  if (params.membershipCovered) {
    return { amountDue: 0, onlineCharge: 0 };
  }

  const afterOffPeak = roundMoney(Math.max(0, params.total - (params.offPeakDiscount ?? 0)));
  const afterDiscount = roundMoney(Math.max(0, afterOffPeak - params.membershipDiscount));
  const amountDue = roundMoney(Math.max(0, afterDiscount - params.giftCardDebit));

  const onlineCharge =
    amountDue <= 0
      ? 0
      : resolveOnlineChargeAmount({
          total: amountDue,
          requireDeposit: params.requireDeposit,
          depositPercentage: params.depositPercentage,
        });

  return { amountDue, onlineCharge };
}
