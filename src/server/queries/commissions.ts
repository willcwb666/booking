import "server-only";
import { db } from "@/lib/db";
import { calculateCommission } from "@/lib/pricing";
import { resolveBookingCommission, resolveRates } from "@/lib/commission-rates";

/**
 * Extrato de comissão por profissional.
 *
 * ─── O que estava errado ─────────────────────────────────────────────────────
 *
 * Este relatório somava apenas `booking`. Toda venda de balcão ficava de fora:
 * o PDV calculava a comissão de produto, gravava em `pos_sale.commissionAmount`
 * e nada disso chegava ao extrato. O profissional que vendeu R$ 500 em produtos
 * via zero — e o dono conferia na planilha, que é justamente o problema que o
 * módulo promete resolver.
 *
 * Além disso a taxa vinha de `commissionPercentage`, enquanto o PDV usava
 * `commissionRate`. Dois números para a mesma pergunta. Agora ambos passam por
 * `resolveRates`.
 *
 * ─── De onde vem cada número ─────────────────────────────────────────────────
 *
 * Serviço  = agendamentos concluídos (comissão calculada com a taxa atual)
 *          + itens SERVICE do PDV (comissão carimbada no ato da venda)
 * Produto  = itens PRODUCT do PDV (comissão carimbada no ato da venda)
 *
 * A assimetria é deliberada: a venda de balcão congela a comissão em
 * `sale_item.commissionAmount` porque o dinheiro já trocou de mão. O
 * agendamento não guarda comissão em lugar nenhum — mudar a taxa de um
 * profissional reescreve retroativamente o que ele ganhou. Está anotado como
 * dívida, não resolvido aqui: exigiria carimbar comissão em `booking` e migrar
 * o histórico.
 *
 * Agregação em SQL. A versão anterior carregava todos os agendamentos
 * concluídos do período com o orçamento junto para somar em JavaScript.
 */

export type CommissionBreakdown = {
  revenue: number;
  commission: number;
};

export type ProfessionalCommissionSummary = {
  id: string;
  name: string;
  email: string | null;
  /** Taxa aplicada a serviços, já resolvida entre os campos legados. */
  serviceRate: number;
  /** Taxa aplicada a produtos. Zero quando não configurada. */
  productRate: number;
  service: CommissionBreakdown;
  product: CommissionBreakdown;
  completedBookingsCount: number;
  /**
   * Quantos dos concluídos ainda não têm comissão carimbada.
   *
   * Existe para a tela poder ser honesta: esses valores ainda se movem se a
   * taxa do profissional mudar, e o dono precisa saber quais.
   */
  unstampedBookingsCount: number;
  posSalesCount: number;
  totalRevenueGenerated: number;
  totalCommissionAmount: number;
  companyRetainedAmount: number;
  recentBookings: Array<{
    id: string;
    customerName: string;
    scheduledDate: string;
    serviceName: string;
    total: number;
    commission: number;
  }>;
};

export type CommissionReport = {
  professionals: ProfessionalCommissionSummary[];
  totalGrossRevenue: number;
  totalCommissionsOwed: number;
  totalNetCompany: number;
  totalCompletedCount: number;
  /** Comissão de balcão anterior à separação por item, ainda só consolidada. */
  unsplitPosCommission: number;
};

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function getCompanyCommissionReport(
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<CommissionReport> {
  const from = startDate ?? null;
  const to = endDate ?? null;

  const [professionals, bookingRows, posRows, recentRows, legacyPosRow] = await Promise.all([
    db.professional.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        commissionPercentage: true,
        commissionRate: true,
        productCommissionRate: true,
      },
      orderBy: { name: "asc" },
    }),

    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT b."professionalId" AS pid,
              COUNT(*)::int AS bookings,
              COALESCE(SUM(e."total"), 0)::float8 AS revenue,
              -- Comissão carimbada na conclusão: é o valor que de fato foi
              -- combinado, e não muda quando a taxa do profissional muda.
              COALESCE(SUM(b."commissionAmount"), 0)::float8 AS stamped_commission,
              -- Receita dos agendamentos SEM carimbo (anteriores a ele). Só
              -- essa parte ainda é recalculada com a taxa atual.
              COALESCE(SUM(CASE WHEN b."commissionAmount" IS NULL THEN e."total" ELSE 0 END), 0)::float8
                AS unstamped_revenue,
              COUNT(*) FILTER (WHERE b."commissionAmount" IS NULL)::int AS unstamped_count
         FROM "booking" b
         LEFT JOIN "estimate" e ON e.id = b."estimateId"
        WHERE b."companyId" = $1
          AND b."status" = 'COMPLETED'
          AND b."professionalId" IS NOT NULL
          AND ($2::text IS NULL OR b."scheduledDate" >= $2)
          AND ($3::text IS NULL OR b."scheduledDate" <= $3)
        GROUP BY 1`,
      companyId,
      from,
      to
    ),

    // Itens do PDV com comissão já carimbada, quebrados por tipo.
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s."professionalId" AS pid,
              i."type" AS type,
              COALESCE(SUM(i."totalPrice"), 0)::float8      AS revenue,
              COALESCE(SUM(i."commissionAmount"), 0)::float8 AS commission,
              COUNT(DISTINCT s.id)::int                      AS sales
         FROM "pos_sale" s
         JOIN "sale_item" i ON i."saleId" = s.id
        WHERE s."companyId" = $1
          AND s."status" = 'COMPLETED'
          AND s."professionalId" IS NOT NULL
          AND ($2::text IS NULL OR s."createdAt" >= $2::date)
          AND ($3::text IS NULL OR s."createdAt" < ($3::date + 1))
        GROUP BY 1, 2`,
      companyId,
      from,
      to
    ),

    db.booking.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        professionalId: { not: null },
        ...(from || to
          ? { scheduledDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      select: {
        id: true,
        professionalId: true,
        scheduledDate: true,
        commissionAmount: true,
        commissionRate: true,
        customerDetail: { select: { firstName: true, lastName: true } },
        estimate: {
          select: {
            total: true,
            serviceTypes: { select: { serviceType: { select: { name: true } } }, take: 1 },
          },
        },
      },
      orderBy: { scheduledDate: "desc" },
      take: 200,
    }),

    // Vendas anteriores à coluna por item: o total existe, o rateio não.
    // Exibido à parte em vez de somado numa das colunas — jogar tudo em
    // "serviço" ou "produto" inventaria uma separação que ninguém registrou.
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COALESCE(SUM(s."commissionAmount"), 0)::float8 AS legacy
         FROM "pos_sale" s
        WHERE s."companyId" = $1
          AND s."status" = 'COMPLETED'
          AND ($2::text IS NULL OR s."createdAt" >= $2::date)
          AND ($3::text IS NULL OR s."createdAt" < ($3::date + 1))
          AND NOT EXISTS (
            SELECT 1 FROM "sale_item" i
             WHERE i."saleId" = s.id AND i."commissionAmount" > 0
          )
          AND s."commissionAmount" > 0`,
      companyId,
      from,
      to
    ),
  ]);

  const summaries = new Map<string, ProfessionalCommissionSummary>();
  for (const p of professionals) {
    const rates = resolveRates(p);
    summaries.set(p.id, {
      id: p.id,
      name: p.name,
      email: p.email,
      serviceRate: rates.service,
      productRate: rates.product,
      service: { revenue: 0, commission: 0 },
      product: { revenue: 0, commission: 0 },
      completedBookingsCount: 0,
      unstampedBookingsCount: 0,
      posSalesCount: 0,
      totalRevenueGenerated: 0,
      totalCommissionAmount: 0,
      companyRetainedAmount: 0,
      recentBookings: [],
    });
  }

  /**
   * Agendamentos concluídos → coluna de serviço.
   *
   * A comissão sai do CARIMBO. Antes, o extrato recalculava tudo com a taxa
   * atual do profissional toda vez que a tela abria — mudar a taxa de alguém
   * reescrevia o que ele já tinha ganhado, e o fechamento da quinzena passada
   * mudava de valor sozinho depois de pago.
   *
   * O que não tem carimbo é anterior a ele, e continua sendo calculado com a
   * taxa atual: não existe registro histórico das taxas para reconstruir, e
   * inventar um número para o passado seria pior que assumir o recurso.
   */
  for (const row of bookingRows) {
    const s = summaries.get(String(row.pid));
    if (!s) continue;
    const revenue = num(row.revenue);
    const unstampedRevenue = num(row.unstamped_revenue);
    const commission =
      num(row.stamped_commission) +
      calculateCommission(unstampedRevenue, s.serviceRate).commission;

    s.completedBookingsCount += num(row.bookings);
    s.unstampedBookingsCount += num(row.unstamped_count);
    s.service.revenue += revenue;
    s.service.commission += commission;
  }

  // Balcão → serviço ou produto, conforme o item.
  const salesSeen = new Map<string, Set<number>>();
  for (const row of posRows) {
    const s = summaries.get(String(row.pid));
    if (!s) continue;
    const bucket = String(row.type) === "PRODUCT" ? s.product : String(row.type) === "SERVICE" ? s.service : null;
    if (bucket) {
      bucket.revenue += num(row.revenue);
      bucket.commission += num(row.commission);
    }
    // `COUNT(DISTINCT s.id)` vem por tipo; somar as linhas contaria duas vezes
    // a comanda que tem produto e serviço juntos.
    const seen = salesSeen.get(s.id) ?? new Set<number>();
    seen.add(num(row.sales));
    salesSeen.set(s.id, seen);
    s.posSalesCount = Math.max(s.posSalesCount, num(row.sales));
  }

  for (const row of recentRows) {
    const s = summaries.get(String(row.professionalId));
    if (!s || s.recentBookings.length >= 15) continue;
    const total = num(row.estimate?.total);
    s.recentBookings.push({
      id: row.id,
      customerName: row.customerDetail
        ? `${row.customerDetail.firstName} ${row.customerDetail.lastName}`.trim()
        : "Cliente",
      scheduledDate: row.scheduledDate,
      serviceName: row.estimate?.serviceTypes?.[0]?.serviceType?.name ?? "Serviço",
      total,
      commission: resolveBookingCommission({
        stampedAmount: row.commissionAmount,
        stampedRate: row.commissionRate,
        total,
        currentRate: s.serviceRate,
      }).commission,
    });
  }

  let totalGrossRevenue = 0;
  let totalCommissionsOwed = 0;
  let totalCompletedCount = 0;

  for (const s of summaries.values()) {
    s.totalRevenueGenerated = s.service.revenue + s.product.revenue;
    s.totalCommissionAmount = s.service.commission + s.product.commission;
    s.companyRetainedAmount = s.totalRevenueGenerated - s.totalCommissionAmount;

    totalGrossRevenue += s.totalRevenueGenerated;
    totalCommissionsOwed += s.totalCommissionAmount;
    totalCompletedCount += s.completedBookingsCount;
  }

  return {
    professionals: Array.from(summaries.values()),
    totalGrossRevenue,
    totalCommissionsOwed,
    totalNetCompany: totalGrossRevenue - totalCommissionsOwed,
    totalCompletedCount,
    unsplitPosCommission: num(legacyPosRow[0]?.legacy),
  };
}
