import "server-only";
import { db } from "@/lib/db";
import { assessWinBack, type WinBackAssessment } from "@/lib/win-back";

/**
 * Lista de clientes com o ciclo de retorno próprio e o quanto passou dele.
 *
 * A mediana dos intervalos sai do Postgres (`percentile_cont` sobre `LAG`), não
 * de laço em JavaScript: uma empresa com mil clientes e vinte visitas cada tem
 * vinte mil linhas, e trazer tudo para memória só para calcular uma mediana é
 * o mesmo erro que já derrubava o relatório da plataforma.
 *
 * A classificação fica em `@/lib/win-back`, testada isoladamente — SQL agrega,
 * TypeScript julga.
 */

export type WinBackCustomer = WinBackAssessment & {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  cycleDays: number | null;
  daysSinceLast: number;
  completedVisits: number;
  lastVisitDate: string;
  totalSpent: number;
  /** Última campanha de resgate enviada, para não repetir disparo. */
  lastWinBackAt: Date | null;
  /** `true` quando o cliente recusou e-mail de marketing. */
  optedOut: boolean;
};

export async function getWinBackCustomers(companyId: string): Promise<WinBackCustomer[]> {
  const rows = await db.$queryRawUnsafe<
    Array<{
      customerId: string;
      name: string;
      email: string;
      phone: string;
      median_gap: number | null;
      visits: number;
      last_visit: string;
      days_since: number;
      totalSpent: number;
      lastWinBackAt: Date | null;
      opted_out: boolean;
    }>
  >(
    `WITH visits AS (
       SELECT b."customerId",
              b."scheduledDate"::date AS visit_date,
              LAG(b."scheduledDate"::date)
                OVER (PARTITION BY b."customerId" ORDER BY b."scheduledDate") AS prev_date
         FROM "booking" b
        WHERE b."companyId" = $1
          AND b."status" = 'COMPLETED'
          AND b."customerId" IS NOT NULL
     ),
     agg AS (
       SELECT "customerId",
              COUNT(*)::int AS visits,
              MAX(visit_date) AS last_visit,
              -- Mediana dos intervalos. Média deixaria uma única viagem longa
              -- esconder o atraso de quem tem histórico grande.
              percentile_cont(0.5) WITHIN GROUP (
                ORDER BY (visit_date - prev_date)
              ) FILTER (WHERE prev_date IS NOT NULL) AS median_gap
         FROM visits
        GROUP BY 1
     )
     SELECT c.id                                        AS "customerId",
            (c."firstName" || ' ' || c."lastName")      AS name,
            c.email                                     AS email,
            c.phone                                     AS phone,
            a.median_gap                                AS median_gap,
            a.visits                                    AS visits,
            to_char(a.last_visit, 'YYYY-MM-DD')         AS last_visit,
            (CURRENT_DATE - a.last_visit)::int          AS days_since,
            c."totalSpent"::float8                      AS "totalSpent",
            c."lastWinBackAt"                           AS "lastWinBackAt",
            COALESCE(np."enableMarketing" = false, false) AS opted_out
       FROM agg a
       JOIN "customer" c ON c.id = a."customerId"
       LEFT JOIN "user" u ON lower(u.email) = lower(c.email)
       LEFT JOIN "user_notification_preference" np ON np."userId" = u.id
      WHERE c."companyId" = $1
      ORDER BY days_since DESC`,
    companyId
  );

  return rows.map((r) => {
    const cycleDays = r.median_gap === null ? null : Math.round(Number(r.median_gap));
    const daysSinceLast = Number(r.days_since ?? 0);
    const completedVisits = Number(r.visits ?? 0);

    return {
      ...assessWinBack({ cycleDays, daysSinceLast, completedVisits }),
      customerId: r.customerId,
      name: r.name?.trim() || "Cliente",
      email: r.email,
      phone: r.phone ?? "",
      cycleDays,
      daysSinceLast,
      completedVisits,
      lastVisitDate: r.last_visit,
      totalSpent: Number(r.totalSpent ?? 0),
      lastWinBackAt: r.lastWinBackAt,
      optedOut: Boolean(r.opted_out),
    };
  });
}
