/**
 * Reposição de estoque a partir da venda real.
 *
 * ─── O que NÃO foi construído ────────────────────────────────────────────────
 *
 * O roadmap pedia dedução teórica de insumo: cada serviço debitaria 50ml de
 * shampoo, uma lâmina, 30g de pó descolorante. Isso exige que o dono cadastre a
 * ficha técnica de cada serviço, e ninguém preenche — é a mesma razão pela qual
 * o módulo de estoque de ERP fica vazio em quase toda pequena empresa.
 *
 * E há um efeito pior que não ter: se a ficha estiver errada — e vai estar,
 * porque o consumo real varia com o comprimento do cabelo — o estoque teórico
 * diverge do real, o alerta dispara errado, e o usuário aprende a ignorar a
 * funcionalidade inteira.
 *
 * Aqui a base é o que de fato saiu pelo caixa. Zero cadastro, dado real.
 *
 * ─── Por que giro, e não só o mínimo ─────────────────────────────────────────
 *
 * `minStockThreshold` sozinho responde "está baixo?", que é a pergunta errada.
 * A pergunta útil é "dá para quantos dias?": três unidades de um produto que
 * vende dez por semana é emergência; três unidades de um que vende um por mês é
 * estoque para um trimestre. O mesmo número, dois significados opostos.
 *
 * Funções puras, sem I/O. A agregação de vendas fica em
 * `src/server/queries/restock.ts`.
 */

export type RestockStatus = "OK" | "LOW" | "CRITICAL" | "OUT" | "STALE";

/** Dias de cobertura que a sugestão de compra busca alcançar. */
export const TARGET_COVER_DAYS = 30;

/** Abaixo disto a situação é crítica: não dá tempo de um pedido chegar. */
export const CRITICAL_COVER_DAYS = 7;

/** Acima disto está confortável. */
export const LOW_COVER_DAYS = 14;

/**
 * Dias sem uma única venda a partir dos quais o produto é considerado parado.
 *
 * Produto encalhado com estoque zero não é urgência de compra — é dinheiro que
 * já não deve ser gasto de novo. Sem esta faixa, o alerta por mínimo colocaria
 * na lista de reposição justamente o que não vende.
 */
export const STALE_DAYS = 90;

export type RestockInput = {
  stockQuantity: number;
  minStockThreshold: number;
  /** Unidades vendidas na janela analisada. */
  unitsSold: number;
  /** Tamanho da janela, em dias. */
  windowDays: number;
  /** Dias desde a última venda. `null` = nunca vendeu. */
  daysSinceLastSale: number | null;
};

export type RestockAssessment = {
  status: RestockStatus;
  /** Unidades vendidas por dia. Zero quando não houve venda na janela. */
  velocityPerDay: number;
  /** Dias até acabar no ritmo atual. `null` quando não há giro. */
  coverDays: number | null;
  /** Quantidade sugerida de compra. Zero quando não há o que repor. */
  suggestedOrder: number;
  reason: string;
};

export function assessRestock(input: RestockInput): RestockAssessment {
  const { stockQuantity, minStockThreshold, unitsSold, windowDays, daysSinceLastSale } = input;

  const safeWindow = windowDays > 0 ? windowDays : 1;
  const velocityPerDay = unitsSold > 0 ? unitsSold / safeWindow : 0;

  // Produto parado. Vem antes de tudo: estoque zerado de algo que ninguém
  // compra há três meses não é falta, é acerto.
  if (velocityPerDay === 0 || (daysSinceLastSale !== null && daysSinceLastSale > STALE_DAYS)) {
    return {
      status: "STALE",
      velocityPerDay: 0,
      coverDays: null,
      suggestedOrder: 0,
      reason:
        daysSinceLastSale === null
          ? "Nunca vendeu — não há giro para repor"
          : `Sem vender há ${daysSinceLastSale} dias`,
    };
  }

  // Estoque negativo é possível: o PDV permite vender além do saldo de
  // propósito, como indicador honesto de furo. Tratado como zero para o
  // cálculo de cobertura, e a sugestão cobre o buraco.
  const effectiveStock = Math.max(0, stockQuantity);
  const coverDays = Math.floor(effectiveStock / velocityPerDay);

  // A compra repõe até o alvo E cobre o rombo, se houver.
  const target = Math.ceil(velocityPerDay * TARGET_COVER_DAYS);
  const suggestedOrder = Math.max(0, target - stockQuantity);

  if (stockQuantity <= 0) {
    return {
      status: "OUT",
      velocityPerDay,
      coverDays: 0,
      suggestedOrder,
      reason:
        stockQuantity < 0
          ? `Vendido ${Math.abs(stockQuantity)} além do saldo — estoque furado`
          : `Sem estoque — vende ~${velocityPerDay.toFixed(1)}/dia`,
    };
  }

  if (coverDays <= CRITICAL_COVER_DAYS) {
    return {
      status: "CRITICAL",
      velocityPerDay,
      coverDays,
      suggestedOrder,
      reason: `Acaba em ~${coverDays} dia${coverDays === 1 ? "" : "s"}`,
    };
  }

  if (coverDays <= LOW_COVER_DAYS || stockQuantity <= minStockThreshold) {
    return {
      status: "LOW",
      velocityPerDay,
      coverDays,
      suggestedOrder,
      // O mínimo configurado continua valendo: é a única informação que o dono
      // deu explicitamente, e ignorá-la seria dizer que ele não sabe do próprio
      // negócio.
      reason:
        stockQuantity <= minStockThreshold
          ? `No mínimo definido (${minStockThreshold}) — cobre ~${coverDays} dias`
          : `Cobre ~${coverDays} dias`,
    };
  }

  return {
    status: "OK",
    velocityPerDay,
    coverDays,
    suggestedOrder: 0,
    reason: `Cobre ~${coverDays} dias`,
  };
}

/** Faixas que entram na lista de compra por padrão. */
export const RESTOCK_ACTIONABLE: RestockStatus[] = ["OUT", "CRITICAL", "LOW"];

export const RESTOCK_LABELS: Record<RestockStatus, string> = {
  OK: "Suficiente",
  LOW: "Baixo",
  CRITICAL: "Crítico",
  OUT: "Sem estoque",
  STALE: "Parado",
};

export const RESTOCK_VARIANTS: Record<
  RestockStatus,
  "success" | "warning" | "danger" | "neutral"
> = {
  OK: "success",
  LOW: "warning",
  CRITICAL: "danger",
  OUT: "danger",
  STALE: "neutral",
};

/**
 * Lista de compra em texto, pronta para colar no WhatsApp do fornecedor.
 *
 * Texto simples e não anexo: o dono manda isso do celular, no meio do
 * expediente, para um contato que provavelmente não abre PDF.
 */
export function buildPurchaseList(
  items: Array<{ name: string; sku?: string | null; suggestedOrder: number }>,
  companyName: string
): string {
  const lines = items
    .filter((i) => i.suggestedOrder > 0)
    .map((i) => `• ${i.name}${i.sku ? ` (${i.sku})` : ""} — ${i.suggestedOrder} un.`);

  if (lines.length === 0) return "";

  return [`Pedido de reposição — ${companyName}`, "", ...lines].join("\n");
}
