import "server-only";
import { db } from "@/lib/db";
import {
  assessTrust,
  NO_SHOW_WINDOW_DAYS,
  type TrustAssessment,
} from "@/lib/trust-tier";

/**
 * Carrega os contadores reais de um cliente e devolve a faixa de confiança.
 *
 * Os números saem de `booking`, não dos campos denormalizados de `customer`.
 * `Customer.completedBookings` e `noShowCount` são mantidos por escrita, e
 * qualquer caminho que altere status sem atualizá-los faria a faixa divergir do
 * que o dono vê na agenda — divergência que custaria dinheiro do cliente. A
 * contagem direta é uma consulta indexada por `(companyId, customerId)`.
 */

/** Data de corte da janela de faltas, em `YYYY-MM-DD`. */
function windowStart(today = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() - NO_SHOW_WINDOW_DAYS);
  return d.toISOString().split("T")[0];
}

export type CustomerTrust = TrustAssessment & {
  completedBookings: number;
  recentNoShows: number;
  totalNoShows: number;
};

export async function getCustomerTrust(params: {
  companyId: string;
  customerEmail?: string | null;
  /** Evita a busca por e-mail quando o chamador já tem o cliente. */
  customerId?: string | null;
}): Promise<CustomerTrust> {
  const { companyId } = params;
  const email = params.customerEmail?.trim().toLowerCase() || null;

  const maxAllowedNoShows = await db.company
    .findUnique({ where: { id: companyId }, select: { maxAllowedNoShows: true } })
    .then((c) => c?.maxAllowedNoShows ?? 0);

  let customerId = params.customerId ?? null;
  if (!customerId && email) {
    const found = await db.customer.findUnique({
      where: { companyId_email: { companyId, email } },
      select: { id: true },
    });
    customerId = found?.id ?? null;
  }

  // Sem ficha na empresa, o cliente é novo aqui — e novo é neutro, não risco.
  if (!customerId) {
    return {
      ...assessTrust({
        completedBookings: 0,
        recentNoShows: 0,
        totalNoShows: 0,
        maxAllowedNoShows,
      }),
      completedBookings: 0,
      recentNoShows: 0,
      totalNoShows: 0,
    };
  }

  const rows = await db.$queryRawUnsafe<
    Array<{ completed: number; total_no_shows: number; recent_no_shows: number }>
  >(
    `SELECT
        COUNT(*) FILTER (WHERE b."status" = 'COMPLETED')::int AS completed,
        COUNT(*) FILTER (WHERE b."status" = 'NO_SHOW')::int   AS total_no_shows,
        COUNT(*) FILTER (WHERE b."status" = 'NO_SHOW'
                           AND b."scheduledDate" >= $3)::int   AS recent_no_shows
       FROM "booking" b
      WHERE b."companyId" = $1 AND b."customerId" = $2`,
    companyId,
    customerId,
    windowStart()
  );

  const r = rows[0] ?? { completed: 0, total_no_shows: 0, recent_no_shows: 0 };
  const counters = {
    completedBookings: Number(r.completed ?? 0),
    recentNoShows: Number(r.recent_no_shows ?? 0),
    totalNoShows: Number(r.total_no_shows ?? 0),
  };

  return { ...assessTrust({ ...counters, maxAllowedNoShows }), ...counters };
}
