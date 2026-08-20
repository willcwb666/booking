/**
 * Confere se o valor que o gateway diz ter recebido cobre o que era devido.
 *
 * ─── Por que isto existe (o defeito) ─────────────────────────────────────────
 *
 * O webhook do Mercado Pago marcava o agendamento como PAGO olhando apenas
 * para `payment.status === "approved"`. O `transaction_amount` que volta na
 * mesma resposta nunca era lido.
 *
 * No Stripe isso não seria um problema: o evento chega amarrado ao
 * PaymentIntent que NÓS criamos, com o valor que NÓS definimos — não há como
 * o número divergir do combinado. No Mercado Pago o pagamento é buscado por
 * id, e o valor dele é um dado como outro qualquer. Um pagamento aprovado por
 * menos do que era devido confirmava o agendamento inteiro.
 *
 * ─── Por que a tolerância de um centavo ──────────────────────────────────────
 *
 * O valor devido é `Decimal(10,2)` no banco e vira `number` em ponto flutuante
 * no caminho até aqui. `0.1 + 0.2` não é `0.3` em nenhuma linguagem que use
 * IEEE 754, e recusar um pagamento correto por um erro de arredondamento seria
 * pior do que o defeito que este arquivo conserta. Um centavo é a menor
 * unidade que as duas moedas do produto (BRL e USD) representam, então a
 * tolerância não abre espaço para diferença que alguém consiga explorar.
 */

/** Menor diferença que ainda é "o mesmo valor" — ver comentário acima. */
const TOLERANCE = 0.01;

export type ChargeVerification =
  /** O pago cobre o devido. Pode confirmar. */
  | { outcome: "covered" }
  /** Pagou menos do que devia. NÃO confirmar. */
  | { outcome: "short"; expected: number; paid: number }
  /**
   * Não há como conferir. O chamador confirma assim mesmo e registra o aviso —
   * recusar aqui puniria o cliente por uma lacuna nossa, não dele.
   */
  | { outcome: "unverifiable"; reason: "sem-valor-esperado" | "sem-valor-pago" };

export function verifyChargeAmount(
  /** O que estava gravado como devido. Nulo em agendamento anterior à coluna. */
  expected: number | null | undefined,
  /** O que o gateway diz ter recebido. */
  paid: number | null | undefined
): ChargeVerification {
  // Zero não é ausência: um agendamento totalmente coberto por vale-presente
  // deve cobrar exatamente zero, e essa é uma expectativa legítima de conferir.
  if (expected === null || expected === undefined || !Number.isFinite(expected)) {
    return { outcome: "unverifiable", reason: "sem-valor-esperado" };
  }
  if (paid === null || paid === undefined || !Number.isFinite(paid)) {
    return { outcome: "unverifiable", reason: "sem-valor-pago" };
  }

  // Pagar A MAIS cobre o devido. Não é trabalho deste módulo decidir o que
  // fazer com a diferença — o agendamento está pago, e é isso que ele responde.
  if (paid >= expected - TOLERANCE) return { outcome: "covered" };

  return { outcome: "short", expected, paid };
}
