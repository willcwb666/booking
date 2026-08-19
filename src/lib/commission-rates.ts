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
