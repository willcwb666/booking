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
