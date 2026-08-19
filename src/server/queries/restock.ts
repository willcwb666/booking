import "server-only";
import { db } from "@/lib/db";
import { assessRestock, type RestockAssessment } from "@/lib/restock";

/**
 * Giro real de cada produto, a partir das vendas do PDV.
 *
 * A fonte é `sale_item` junto a `pos_sale`, não `stock_movement`: o movimento
 * registra também entrada, ajuste e devolução, e somar tudo como "saída"
 * inflaria o giro. Aqui interessa só o que o cliente levou.
 *
 * Vendas estornadas ou canceladas ficam de fora — o produto voltou para a
 * prateleira, e contá-lo como vendido pediria reposição do que não saiu.
 */

export type RestockItem = RestockAssessment & {
  productId: string;
  name: string;
  sku: string | null;
  category: string | null;
  stockQuantity: number;
  minStockThreshold: number;
  costPrice: number;
  unitsSold: number;
  daysSinceLastSale: number | null;
  /** Custo estimado do pedido sugerido. */
  estimatedCost: number;
};

export async function getRestockList(
  companyId: string,
  windowDays = 60
): Promise<{ items: RestockItem[]; windowDays: number }> {
  const rows = await db.$queryRawUnsafe<
    Array<{
      productId: string;
      name: string;
      sku: string | null;
      category: string | null;
      stockQuantity: number;
      minStockThreshold: number;
      costPrice: number;
      units_sold: number;
      days_since_last_sale: number | null;
    }>
  >(
    `SELECT p.id                          AS "productId",
            p.name                        AS name,
            p.sku                         AS sku,
            p.category                    AS category,
            p."stockQuantity"             AS "stockQuantity",
            p."minStockThreshold"         AS "minStockThreshold",
            p."costPrice"::float8         AS "costPrice",
            -- O FILTER é obrigatório, não decorativo. As condições de status e
            -- de janela ficam no LEFT JOIN de pos_sale, mas a soma percorre as
            -- linhas de sale_item, que entram no resultado mesmo quando a venda
            -- não casa. Sem isto, venda estornada e venda antiga continuavam
            -- contando como giro.
            COALESCE(SUM(i.quantity) FILTER (WHERE s.id IS NOT NULL), 0)::int AS units_sold,
            -- Nulo quando nunca vendeu: distinguir "sem giro" de "giro zero na
            -- janela" muda a classificação do produto.
            MIN(EXTRACT(DAY FROM (NOW() - s."createdAt"))::int)
              FILTER (WHERE s.id IS NOT NULL) AS days_since_last_sale
       FROM "product" p
       LEFT JOIN "sale_item" i ON i."productId" = p.id
       LEFT JOIN "pos_sale" s ON s.id = i."saleId"
                             AND s."status" = 'COMPLETED'
                             AND s."createdAt" >= NOW() - ($2::int * INTERVAL '1 day')
      WHERE p."companyId" = $1
        AND p."isActive" = true
      GROUP BY p.id, p.name, p.sku, p.category, p."stockQuantity",
               p."minStockThreshold", p."costPrice"
      ORDER BY p.name`,
    companyId,
    windowDays
  );

  const items = rows.map((r) => {
    const stockQuantity = Number(r.stockQuantity ?? 0);
    const minStockThreshold = Number(r.minStockThreshold ?? 0);
    const unitsSold = Number(r.units_sold ?? 0);
    const daysSinceLastSale =
      r.days_since_last_sale === null ? null : Number(r.days_since_last_sale);
    const costPrice = Number(r.costPrice ?? 0);

    const assessment = assessRestock({
      stockQuantity,
      minStockThreshold,
      unitsSold,
      windowDays,
      daysSinceLastSale,
    });

    return {
      ...assessment,
      productId: r.productId,
      name: r.name,
      sku: r.sku,
      category: r.category,
      stockQuantity,
      minStockThreshold,
      costPrice,
      unitsSold,
      daysSinceLastSale,
      estimatedCost: Math.round(assessment.suggestedOrder * costPrice * 100) / 100,
    };
  });

  return { items, windowDays };
}
