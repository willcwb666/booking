import "server-only";
import { db } from "@/lib/db";
import {
  enumerateBuckets,
  percentDelta,
  type AnalyticsRange,
  type Granularity,
} from "@/lib/analytics-range";

/**
 * Agregação para os painéis.
 *
 * Tudo aqui é `GROUP BY` no Postgres, nunca soma em memória. A consulta
 * anterior de receita da plataforma carregava *todos* os agendamentos pagos com
 * o orçamento junto para somar em JavaScript — funciona com dez empresas e
 * derruba o processo com mil.
 *
 * A granularidade entra na SQL por interpolação, e isso é seguro porque vem de
 * um conjunto fechado validado em `resolveRange`; todo o resto vai por
 * parâmetro posicional.
 */

export type SeriesPoint = {
  bucket: string;
  bookings: number;
  revenue: number;
  companies: number;
  users: number;
};

export type Delta = {
  current: number;
  previous: number;
  /** Variação percentual, ou `null` quando o período anterior foi zero. */
  percent: number | null;
};

export type Breakdown = { label: string; value: number; secondary?: number };

/** Expressão de bucket para uma coluna `timestamp`. */
function tsBucket(column: string, g: Granularity): string {
  return `to_char(date_trunc('${g}', ${column}), 'YYYY-MM-DD')`;
}

/** Expressão de bucket para uma coluna de data em texto (`YYYY-MM-DD`). */
function dateStrBucket(column: string, g: Granularity): string {
  if (g === "day") return column;
  return `to_char(date_trunc('${g}', ${column}::date), 'YYYY-MM-DD')`;
}

function toNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mergeSeries(
  range: AnalyticsRange,
  parts: Partial<Record<keyof Omit<SeriesPoint, "bucket">, Map<string, number>>>
): SeriesPoint[] {
  return enumerateBuckets(range).map((bucket) => ({
    bucket,
    bookings: parts.bookings?.get(bucket) ?? 0,
    revenue: parts.revenue?.get(bucket) ?? 0,
    companies: parts.companies?.get(bucket) ?? 0,
    users: parts.users?.get(bucket) ?? 0,
  }));
}

function rowsToMap(
  rows: Array<Record<string, unknown>>,
  key: string
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(String(r.bucket), toNum(r[key]));
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════
// Plataforma (super admin)
// ═══════════════════════════════════════════════════════════════════════════

export type PlatformOverview = {
  series: SeriesPoint[];
  bookings: Delta;
  revenue: Delta;
  newCompanies: Delta;
  newUsers: Delta;
  /** MRR atual — é um retrato de agora, não do recorte. */
  mrr: number;
  arr: number;
  arpu: number;
  activeSubscriptions: number;
  overdueSubscriptions: number;
  planBreakdown: Breakdown[];
  statusBreakdown: Breakdown[];
  topCompanies: { id: string; name: string; slug: string; bookings: number; revenue: number }[];
};

export async function getPlatformOverview(
  range: AnalyticsRange
): Promise<PlatformOverview> {
  const g = range.granularity;
  const { from, to, prevFrom, prevTo } = range;

  const [
    bookingRows,
    companyRows,
    userRows,
    currentTotals,
    previousTotals,
    subs,
    planRows,
    statusRows,
    topRows,
  ] = await Promise.all([
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${dateStrBucket('b."scheduledDate"', g)} AS bucket,
              COUNT(*)::int AS bookings,
              COALESCE(SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN e."total" ELSE 0 END), 0)::float8 AS revenue
         FROM "booking" b
         LEFT JOIN "estimate" e ON e.id = b."estimateId"
        WHERE b."scheduledDate" >= $1 AND b."scheduledDate" <= $2
        GROUP BY 1`,
      from,
      to
    ),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${tsBucket('c."createdAt"', g)} AS bucket, COUNT(*)::int AS companies
         FROM "company" c
        WHERE c."createdAt" >= $1::date AND c."createdAt" < ($2::date + 1)
        GROUP BY 1`,
      from,
      to
    ),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${tsBucket('u."createdAt"', g)} AS bucket, COUNT(*)::int AS users
         FROM "user" u
        WHERE u."createdAt" >= $1::date AND u."createdAt" < ($2::date + 1)
        GROUP BY 1`,
      from,
      to
    ),
    platformTotals(from, to),
    platformTotals(prevFrom, prevTo),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT c."subscriptionStatus" AS status,
              c."subscriptionInterval" AS interval,
              COALESCE(p."priceMonthly", 0)::float8 AS "priceMonthly",
              COALESCE(p."priceYearly", 0)::float8 AS "priceYearly",
              COALESCE(p."displayName", 'Sem plano') AS "planName",
              COUNT(*)::int AS companies
         FROM "company" c
         LEFT JOIN "plan" p ON p.id = c."planId"
        WHERE c."isActive" = true
        GROUP BY 1, 2, 3, 4, 5`
    ),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COALESCE(p."displayName", 'Sem plano') AS label, COUNT(*)::int AS value
         FROM "company" c
         LEFT JOIN "plan" p ON p.id = c."planId"
        WHERE c."isActive" = true
        GROUP BY 1
        ORDER BY 2 DESC`
    ),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT b."status"::text AS label, COUNT(*)::int AS value
         FROM "booking" b
        WHERE b."scheduledDate" >= $1 AND b."scheduledDate" <= $2
        GROUP BY 1
        ORDER BY 2 DESC`,
      from,
      to
    ),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT c.id, c.name, c.slug,
              COUNT(b.id)::int AS bookings,
              COALESCE(SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN e."total" ELSE 0 END), 0)::float8 AS revenue
         FROM "company" c
         JOIN "booking" b ON b."companyId" = c.id
          AND b."scheduledDate" >= $1 AND b."scheduledDate" <= $2
         LEFT JOIN "estimate" e ON e.id = b."estimateId"
        GROUP BY c.id, c.name, c.slug
        ORDER BY revenue DESC, bookings DESC
        LIMIT 8`,
      from,
      to
    ),
  ]);

  let mrr = 0;
  let activeSubscriptions = 0;
  let overdueSubscriptions = 0;
  for (const row of subs) {
    const count = toNum(row.companies);
    const status = row.status as string | null;
    if (status === "past_due" || status === "unpaid") {
      overdueSubscriptions += count;
      continue;
    }
    activeSubscriptions += count;
    mrr +=
      row.interval === "year" && toNum(row.priceYearly) > 0
        ? (toNum(row.priceYearly) / 12) * count
        : toNum(row.priceMonthly) * count;
  }

  const mk = (current: number, previous: number): Delta => ({
    current,
    previous,
    percent: percentDelta(current, previous),
  });

  return {
    series: mergeSeries(range, {
      bookings: rowsToMap(bookingRows, "bookings"),
      revenue: rowsToMap(bookingRows, "revenue"),
      companies: rowsToMap(companyRows, "companies"),
      users: rowsToMap(userRows, "users"),
    }),
    bookings: mk(currentTotals.bookings, previousTotals.bookings),
    revenue: mk(currentTotals.revenue, previousTotals.revenue),
    newCompanies: mk(currentTotals.companies, previousTotals.companies),
    newUsers: mk(currentTotals.users, previousTotals.users),
    mrr,
    arr: mrr * 12,
    arpu: activeSubscriptions > 0 ? mrr / activeSubscriptions : 0,
    activeSubscriptions,
    overdueSubscriptions,
    planBreakdown: planRows.map((r) => ({
      label: String(r.label),
      value: toNum(r.value),
    })),
    statusBreakdown: statusRows.map((r) => ({
      label: String(r.label),
      value: toNum(r.value),
    })),
    topCompanies: topRows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      slug: String(r.slug),
      bookings: toNum(r.bookings),
      revenue: toNum(r.revenue),
    })),
  };
}

async function platformTotals(from: string, to: string) {
  const [bookingAgg, companyAgg, userAgg] = await Promise.all([
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int AS bookings,
              COALESCE(SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN e."total" ELSE 0 END), 0)::float8 AS revenue
         FROM "booking" b
         LEFT JOIN "estimate" e ON e.id = b."estimateId"
        WHERE b."scheduledDate" >= $1 AND b."scheduledDate" <= $2`,
      from,
      to
    ),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int AS companies FROM "company"
        WHERE "createdAt" >= $1::date AND "createdAt" < ($2::date + 1)`,
      from,
      to
    ),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int AS users FROM "user"
        WHERE "createdAt" >= $1::date AND "createdAt" < ($2::date + 1)`,
      from,
      to
    ),
  ]);

  return {
    bookings: toNum(bookingAgg[0]?.bookings),
    revenue: toNum(bookingAgg[0]?.revenue),
    companies: toNum(companyAgg[0]?.companies),
    users: toNum(userAgg[0]?.users),
  };
}

export type PlatformActivityItem = {
  kind: "company" | "booking" | "user";
  title: string;
  detail: string;
  at: string;
};

/**
 * Feed de eventos reais da plataforma.
 *
 * Substitui uma lista fixa de três eventos inventados ("Studio Hair Prime
 * ativou o Plano Pro", "Há 12 min") que era exibida sob um selo "● TEMPO
 * REAL". Aqui cada linha é uma linha do banco, com o horário de verdade.
 */
export async function getPlatformActivity(
  limit = 8
): Promise<PlatformActivityItem[]> {
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `(SELECT 'company' AS kind, c.name AS title,
             COALESCE(p."displayName", 'Sem plano') AS detail, c."createdAt" AS at
        FROM "company" c
        LEFT JOIN "plan" p ON p.id = c."planId"
       ORDER BY c."createdAt" DESC LIMIT $1)
     UNION ALL
     (SELECT 'booking' AS kind, co.name AS title,
             b."scheduledDate" || ' ' || b."scheduledStartTime" AS detail, b."createdAt" AS at
        FROM "booking" b
        JOIN "company" co ON co.id = b."companyId"
       ORDER BY b."createdAt" DESC LIMIT $1)
     UNION ALL
     (SELECT 'user' AS kind, u.name AS title, u.email AS detail, u."createdAt" AS at
        FROM "user" u
       ORDER BY u."createdAt" DESC LIMIT $1)
     ORDER BY at DESC
     LIMIT $1`,
    limit
  );

  return rows.map((r) => ({
    kind: r.kind as PlatformActivityItem["kind"],
    title: String(r.title ?? ""),
    detail: String(r.detail ?? ""),
    at: new Date(r.at as string).toISOString(),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// Empresa (painel do estabelecimento)
// ═══════════════════════════════════════════════════════════════════════════

export type CompanyOverview = {
  series: SeriesPoint[];
  bookings: Delta;
  revenue: Delta;
  ticket: Delta;
  newCustomers: Delta;
  cancellationRate: Delta;
  statusBreakdown: Breakdown[];
  topServices: Breakdown[];
  byProfessional: Breakdown[];
  /** Ocupação por hora do dia: onde a agenda realmente lota. */
  byHour: Breakdown[];
};

export async function getCompanyOverview(
  companyId: string,
  range: AnalyticsRange
): Promise<CompanyOverview> {
  const g = range.granularity;
  const { from, to, prevFrom, prevTo } = range;

  const [seriesRows, current, previous, statusRows, serviceRows, profRows, hourRows] =
    await Promise.all([
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT ${dateStrBucket('b."scheduledDate"', g)} AS bucket,
                COUNT(*)::int AS bookings,
                COALESCE(SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN e."total" ELSE 0 END), 0)::float8 AS revenue
           FROM "booking" b
           LEFT JOIN "estimate" e ON e.id = b."estimateId"
          WHERE b."companyId" = $1
            AND b."scheduledDate" >= $2 AND b."scheduledDate" <= $3
          GROUP BY 1`,
        companyId,
        from,
        to
      ),
      companyTotals(companyId, from, to),
      companyTotals(companyId, prevFrom, prevTo),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT b."status"::text AS label, COUNT(*)::int AS value
           FROM "booking" b
          WHERE b."companyId" = $1
            AND b."scheduledDate" >= $2 AND b."scheduledDate" <= $3
          GROUP BY 1 ORDER BY 2 DESC`,
        companyId,
        from,
        to
      ),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT s."name" AS label,
                COUNT(DISTINCT b.id)::int AS value,
                COALESCE(SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN est."total" ELSE 0 END), 0)::float8 AS secondary
           FROM "booking" b
           JOIN "estimate" e ON e.id = b."estimateId"
           JOIN "estimate_service_type" est_link ON est_link."estimateId" = e.id
           JOIN "service_type" st ON st.id = est_link."serviceTypeId"
           JOIN "service" s ON s.id = st."serviceId"
           LEFT JOIN "estimate" est ON est.id = b."estimateId"
          WHERE b."companyId" = $1
            AND b."scheduledDate" >= $2 AND b."scheduledDate" <= $3
          GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
        companyId,
        from,
        to
      ),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT COALESCE(p."name", 'Sem profissional') AS label,
                COUNT(*)::int AS value,
                COALESCE(SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN e."total" ELSE 0 END), 0)::float8 AS secondary
           FROM "booking" b
           LEFT JOIN "professional" p ON p.id = b."professionalId"
           LEFT JOIN "estimate" e ON e.id = b."estimateId"
          WHERE b."companyId" = $1
            AND b."scheduledDate" >= $2 AND b."scheduledDate" <= $3
          GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
        companyId,
        from,
        to
      ),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT substring(b."scheduledStartTime", 1, 2) AS label, COUNT(*)::int AS value
           FROM "booking" b
          WHERE b."companyId" = $1
            AND b."scheduledDate" >= $2 AND b."scheduledDate" <= $3
          GROUP BY 1 ORDER BY 1`,
        companyId,
        from,
        to
      ),
    ]);

  const mk = (c: number, p: number): Delta => ({
    current: c,
    previous: p,
    percent: percentDelta(c, p),
  });

  return {
    series: mergeSeries(range, {
      bookings: rowsToMap(seriesRows, "bookings"),
      revenue: rowsToMap(seriesRows, "revenue"),
    }),
    bookings: mk(current.bookings, previous.bookings),
    revenue: mk(current.revenue, previous.revenue),
    ticket: mk(current.ticket, previous.ticket),
    newCustomers: mk(current.newCustomers, previous.newCustomers),
    cancellationRate: mk(current.cancellationRate, previous.cancellationRate),
    statusBreakdown: statusRows.map((r) => ({
      label: String(r.label),
      value: toNum(r.value),
    })),
    topServices: serviceRows.map((r) => ({
      label: String(r.label),
      value: toNum(r.value),
      secondary: toNum(r.secondary),
    })),
    byProfessional: profRows.map((r) => ({
      label: String(r.label),
      value: toNum(r.value),
      secondary: toNum(r.secondary),
    })),
    byHour: hourRows.map((r) => ({
      label: `${String(r.label).padStart(2, "0")}h`,
      value: toNum(r.value),
    })),
  };
}

async function companyTotals(companyId: string, from: string, to: string) {
  const [agg, customers] = await Promise.all([
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int AS bookings,
              COUNT(*) FILTER (WHERE b."status" = 'CANCELLED')::int AS cancelled,
              COUNT(*) FILTER (WHERE b."paymentStatus" = 'PAID')::int AS paid,
              COALESCE(SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN e."total" ELSE 0 END), 0)::float8 AS revenue
         FROM "booking" b
         LEFT JOIN "estimate" e ON e.id = b."estimateId"
        WHERE b."companyId" = $1
          AND b."scheduledDate" >= $2 AND b."scheduledDate" <= $3`,
      companyId,
      from,
      to
    ),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COUNT(*)::int AS value FROM "customer"
        WHERE "companyId" = $1
          AND "createdAt" >= $2::date AND "createdAt" < ($3::date + 1)`,
      companyId,
      from,
      to
    ),
  ]);

  const row = agg[0] ?? {};
  const bookings = toNum(row.bookings);
  const revenue = toNum(row.revenue);
  const paid = toNum(row.paid);

  return {
    bookings,
    revenue,
    ticket: paid > 0 ? revenue / paid : 0,
    cancellationRate: bookings > 0 ? (toNum(row.cancelled) / bookings) * 100 : 0,
    newCustomers: toNum(customers[0]?.value),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Cliente (painel de quem agenda)
// ═══════════════════════════════════════════════════════════════════════════

export type CustomerOverview = {
  series: SeriesPoint[];
  bookings: Delta;
  spent: Delta;
  byService: Breakdown[];
  upcoming: number;
  completed: number;
  cancelled: number;
};

export async function getCustomerOverview(
  companyId: string,
  customerEmail: string,
  range: AnalyticsRange
): Promise<CustomerOverview> {
  const g = range.granularity;
  const { from, to, prevFrom, prevTo } = range;
  const email = customerEmail.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  const [seriesRows, current, previous, serviceRows, counts] = await Promise.all([
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${dateStrBucket('b."scheduledDate"', g)} AS bucket,
              COUNT(*)::int AS bookings,
              COALESCE(SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN e."total" ELSE 0 END), 0)::float8 AS revenue
         FROM "booking" b
         LEFT JOIN "estimate" e ON e.id = b."estimateId"
        WHERE b."companyId" = $1 AND lower(e."customerEmail") = $2
          AND b."scheduledDate" >= $3 AND b."scheduledDate" <= $4
        GROUP BY 1`,
      companyId,
      email,
      from,
      to
    ),
    customerTotals(companyId, email, from, to),
    customerTotals(companyId, email, prevFrom, prevTo),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s."name" AS label, COUNT(DISTINCT b.id)::int AS value
         FROM "booking" b
         JOIN "estimate" e ON e.id = b."estimateId"
         JOIN "estimate_service_type" link ON link."estimateId" = e.id
         JOIN "service_type" st ON st.id = link."serviceTypeId"
         JOIN "service" s ON s.id = st."serviceId"
        WHERE b."companyId" = $1 AND lower(e."customerEmail") = $2
          AND b."scheduledDate" >= $3 AND b."scheduledDate" <= $4
        GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
      companyId,
      email,
      from,
      to
    ),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT
         COUNT(*) FILTER (WHERE b."scheduledDate" >= $3 AND b."status" IN ('PENDING','CONFIRMED'))::int AS upcoming,
         COUNT(*) FILTER (WHERE b."status" = 'COMPLETED')::int AS completed,
         COUNT(*) FILTER (WHERE b."status" = 'CANCELLED')::int AS cancelled
       FROM "booking" b
       JOIN "estimate" e ON e.id = b."estimateId"
      WHERE b."companyId" = $1 AND lower(e."customerEmail") = $2`,
      companyId,
      email,
      today
    ),
  ]);

  const mk = (c: number, p: number): Delta => ({
    current: c,
    previous: p,
    percent: percentDelta(c, p),
  });
  const row = counts[0] ?? {};

  return {
    series: mergeSeries(range, {
      bookings: rowsToMap(seriesRows, "bookings"),
      revenue: rowsToMap(seriesRows, "revenue"),
    }),
    bookings: mk(current.bookings, previous.bookings),
    spent: mk(current.revenue, previous.revenue),
    byService: serviceRows.map((r) => ({
      label: String(r.label),
      value: toNum(r.value),
    })),
    upcoming: toNum(row.upcoming),
    completed: toNum(row.completed),
    cancelled: toNum(row.cancelled),
  };
}

async function customerTotals(
  companyId: string,
  email: string,
  from: string,
  to: string
) {
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT COUNT(*)::int AS bookings,
            COALESCE(SUM(CASE WHEN b."paymentStatus" = 'PAID' THEN e."total" ELSE 0 END), 0)::float8 AS revenue
       FROM "booking" b
       LEFT JOIN "estimate" e ON e.id = b."estimateId"
      WHERE b."companyId" = $1 AND lower(e."customerEmail") = $2
        AND b."scheduledDate" >= $3 AND b."scheduledDate" <= $4`,
    companyId,
    email,
    from,
    to
  );
  return {
    bookings: toNum(rows[0]?.bookings),
    revenue: toNum(rows[0]?.revenue),
  };
}
