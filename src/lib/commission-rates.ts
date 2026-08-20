/**
 * Taxas de comissão de um profissional, por tipo de item.
 *
 * ─── O problema que isto resolve ─────────────────────────────────────────────
 *
 * `Professional` acumulou três campos para duas ideias:
 *
 *   commissionPercentage   Float     — campo original
 *   commissionRate         Decimal?  — substituto, com casas decimais
 *   productCommissionRate  Decimal?  — taxa de produto
 *
 * E cada lugar resolvia a ambiguidade do seu jeito: o PDV usava
 * `commissionRate ?? commissionPercentage`, o relatório de comissão usava só
 * `commissionPercentage`, e a listagem de profissionais fazia os dois se
 * cobrirem em ordem inversa. Três respostas para "quanto este profissional
 * ganha" — que é exatamente o tipo de divergência que transforma o fechamento
 * da quinzena no inferno de planilha que o produto promete resolver.
 *
 * Aqui é uma resposta só. Funções puras, sem I/O.
 */

export type CommissionRates = {
  /** Percentual sobre serviços prestados. */
  service: number;
  /** Percentual sobre produtos vendidos no balcão. */
  product: number;
};

/** Campos crus do profissional, como saem do Prisma (Decimal vira unknown). */
export type ProfessionalRateFields = {
  commissionPercentage?: number | null;
  commissionRate?: unknown;
  productCommissionRate?: unknown;
};

function toRate(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  // Fora da faixa não é "quase certo", é dado corrompido — tratar como ausente
  // e cair no próximo da cadeia é melhor que pagar 1.400% de comissão.
  if (n < 0 || n > 100) return null;
  return n;
}

/**
 * Taxa de serviço: `commissionRate` manda, `commissionPercentage` é o legado.
 *
 * Zero é um valor legítimo ("este profissional não recebe comissão"), então a
 * cadeia usa nulo — e não falsy — como sinal de ausência. Um `?? 0` ingênuo
 * aqui faria `commissionRate = 0` cair para o legado e ressuscitar uma taxa que
 * o dono tinha acabado de zerar.
 */
export function resolveRates(p: ProfessionalRateFields): CommissionRates {
  const rate = toRate(p.commissionRate);
  const legacy = toRate(p.commissionPercentage);
  const product = toRate(p.productCommissionRate);

  return {
    service: rate ?? legacy ?? 0,
    // Sem taxa de produto configurada a comissão de produto é zero, não a de
    // serviço: vender uma pomada não pode pagar como cortar cabelo por engano.
    product: product ?? 0,
  };
}

/**
 * Comissão de um agendamento — o carimbo manda, a taxa atual é o recurso.
 *
 * ─── Por que existe carimbo ──────────────────────────────────────────────────
 *
 * O extrato calculava a comissão do agendamento com a taxa ATUAL do
 * profissional, toda vez que alguém abria a tela. Mudar a taxa de alguém
 * reescrevia o que ele já tinha ganhado: o fechamento da quinzena passada
 * mudava de valor sozinho, depois de pago. A venda de balcão nunca teve esse
 * problema porque congela a comissão no ato da venda — o dinheiro já trocou de
 * mão.
 *
 * ─── Por que ainda existe o recurso ──────────────────────────────────────────
 *
 * Os agendamentos anteriores a este carimbo não têm o valor, e não existe
 * registro histórico das taxas para reconstruí-lo. Inventar um número para o
 * passado seria pior que admitir que ele não foi carimbado. Para essas linhas o
 * comportamento antigo continua — é o melhor disponível — e `stamped` diz qual
 * dos dois foi usado, para a tela poder ser honesta sobre isso.
 */
export function resolveBookingCommission(params: {
  /** Valor carimbado na conclusão. Nulo nos agendamentos antigos. */
  stampedAmount?: unknown;
  /** Taxa carimbada junto. Só para explicar a conta. */
  stampedRate?: unknown;
  total: number;
  /** Taxa atual do profissional, usada apenas quando não há carimbo. */
  currentRate: number;
}): { commission: number; rate: number; stamped: boolean } {
  const amount = Number(params.stampedAmount);
  if (params.stampedAmount !== null && params.stampedAmount !== undefined && Number.isFinite(amount) && amount >= 0) {
    const rate = toRate(params.stampedRate);
    return { commission: amount, rate: rate ?? params.currentRate, stamped: true };
  }

  const total = Number(params.total);
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  return {
    commission: (safeTotal * params.currentRate) / 100,
    rate: params.currentRate,
    stamped: false,
  };
}

/** Comissão de um item, pela taxa do seu tipo. */
export function commissionForItem(params: {
  type: string;
  totalPrice: number;
  rates: CommissionRates;
}): number {
  const { type, totalPrice, rates } = params;
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) return 0;

  // FEE (taxas de conveniência, acréscimos) não gera comissão: não é trabalho
  // do profissional nem produto do estoque.
  const rate =
    type === "PRODUCT" ? rates.product : type === "SERVICE" ? rates.service : 0;

  return (totalPrice * rate) / 100;
}
