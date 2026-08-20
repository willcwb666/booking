import "server-only";
import { db } from "@/lib/db";
import { resolveBookingCommission, resolveRates } from "@/lib/commission-rates";
import { computeGoalProgress, rankTeam, projectDayTotal, type GoalProgress, type RankedEntry } from "@/lib/team-goals";
import { todayInTimezone, minutesIntoDayInTimezone } from "@/lib/company-date";

/**
 * O dia do profissional: quanto gerou, quanto ganhou, o que ainda tem pela
 * frente e a que distância está da própria meta.
 *
 * ─── De onde vem cada número ─────────────────────────────────────────────────
 *
 * Faturamento = agendamentos CONCLUÍDOS hoje (total do orçamento)
 *             + itens do PDV vendidos hoje por ele.
 *
 * Comissão    = a do agendamento, calculada com a taxa ATUAL
 *             + a do PDV, carimbada no ato da venda.
 *
 * A assimetria é herdada e está anotada em `queries/commissions.ts`: a venda de
 * balcão congela a comissão porque o dinheiro já trocou de mão; o agendamento
 * não guarda comissão em lugar nenhum, então mudar a taxa reescreve o passado.
 * É dívida conhecida, não desatenção — e aqui ela aparece igual ao extrato, o
 * que é melhor que aparecer diferente.
 *
 * ─── "Hoje" é o da empresa ───────────────────────────────────────────────────
 *
 * O servidor roda em UTC. Sem converter para o fuso da empresa, o painel de um
 * salão em Denver zeraria no meio da tarde.
 */

export type DayService = {
  id: string;
  startTime: string;
  endTime: string;
  customerName: string;
  serviceName: string;
  total: number;
  status: string;
};

export type ProfessionalDayPanel = {
  professionalId: string;
  professionalName: string;
  date: string;
  currency: string;
  locale: string;
  /** Faturamento gerado hoje, já concluído. */
  revenue: number;
  /** Comissão acumulada hoje. */
  commission: number;
  goal: GoalProgress;
  /** Fechamento estimado no ritmo atual. Nulo cedo demais ou tarde demais. */
  projection: number | null;
  services: DayService[];
  /** Atendimentos ainda por vir hoje — o que ainda pode virar meta. */
  upcomingCount: number;
};

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function getProfessionalDayPanel(input: {
  companyId: string;
  professionalId: string;
  /** Sobrescreve o dia; sem isso, hoje no fuso da empresa. */
  date?: string;
}): Promise<ProfessionalDayPanel | null> {
  const company = await db.company.findUnique({
    where: { id: input.companyId },
    select: { timezone: true, currency: true, locale: true },
  });
  if (!company) return null;

  const professional = await db.professional.findFirst({
    where: { id: input.professionalId, companyId: input.companyId },
    select: {
      id: true,
      name: true,
      dailyGoal: true,
      commissionPercentage: true,
      commissionRate: true,
      productCommissionRate: true,
    },
  });
  if (!professional) return null;

  const date = input.date ?? todayInTimezone(company.timezone);
  const rates = resolveRates(professional);

  const [bookings, posRows, agenda] = await Promise.all([
    db.booking.findMany({
      where: {
        companyId: input.companyId,
        professionalId: professional.id,
        scheduledDate: date,
        status: { notIn: ["CANCELLED"] },
      },
      orderBy: { scheduledStartTime: "asc" },
      select: {
        id: true,
        scheduledStartTime: true,
        scheduledEndTime: true,
        status: true,
        commissionAmount: true,
        commissionRate: true,
        customerDetail: { select: { firstName: true, lastName: true } },
        bookingConfig: { select: { name: true } },
        estimate: { select: { total: true } },
      },
    }),

    // Itens de balcão vendidos por ele hoje. A comissão vem carimbada.
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT COALESCE(SUM(i."totalPrice"), 0)::float8       AS revenue,
              COALESCE(SUM(i."commissionAmount"), 0)::float8 AS commission
         FROM "pos_sale" s
         JOIN "sale_item" i ON i."saleId" = s.id
        WHERE s."companyId" = $1
          AND s."professionalId" = $2
          AND s."status" = 'COMPLETED'
          AND s."createdAt" >= $3::date
          AND s."createdAt" < ($3::date + 1)`,
      input.companyId,
      professional.id,
      date
    ),

    // Grade do dia, para a projeção saber o tamanho do expediente.
    db.agenda.findFirst({
      where: { companyId: input.companyId, status: "ACTIVE" },
      select: { startTime: true, endTime: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const bookingRevenue = completed.reduce((acc, b) => acc + num(b.estimate?.total), 0);

  // A comissão sai do CARIMBO gravado na conclusão, com recurso à taxa atual só
  // nos agendamentos anteriores a ele. Calcular aqui de um jeito e no extrato de
  // outro é como o item 12 encontrou três respostas para "quanto este
  // profissional ganha".
  const bookingCommission = completed.reduce(
    (acc, b) =>
      acc +
      resolveBookingCommission({
        stampedAmount: b.commissionAmount,
        stampedRate: b.commissionRate,
        total: num(b.estimate?.total),
        currentRate: rates.service,
      }).commission,
    0
  );

  const posRevenue = num(posRows[0]?.revenue);
  const posCommission = num(posRows[0]?.commission);

  const revenue = Math.round((bookingRevenue + posRevenue) * 100) / 100;
  const commission = Math.round((bookingCommission + posCommission) * 100) / 100;

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const dayStart = agenda ? toMinutes(agenda.startTime) : 8 * 60;
  const dayEnd = agenda ? toMinutes(agenda.endTime) : 18 * 60;

  // A projeção só faz sentido para o dia corrente: num dia passado o
  // "ritmo" já terminou, e num dia futuro não começou.
  const isToday = date === todayInTimezone(company.timezone);
  const elapsed = isToday
    ? Math.max(0, minutesIntoDayInTimezone(company.timezone) - dayStart)
    : 0;

  return {
    professionalId: professional.id,
    professionalName: professional.name,
    date,
    currency: company.currency,
    locale: company.locale,
    revenue,
    commission,
    goal: computeGoalProgress(revenue, professional.dailyGoal),
    projection: isToday
      ? projectDayTotal({
          achieved: revenue,
          minutesElapsed: elapsed,
          minutesTotal: Math.max(1, dayEnd - dayStart),
        })
      : null,
    services: bookings.map((b) => ({
      id: b.id,
      startTime: b.scheduledStartTime,
      endTime: b.scheduledEndTime,
      customerName: b.customerDetail
        ? `${b.customerDetail.firstName} ${b.customerDetail.lastName}`.trim()
        : "Cliente",
      serviceName: b.bookingConfig.name,
      total: num(b.estimate?.total),
      status: b.status,
    })),
    upcomingCount: bookings.filter(
      (b) => b.status === "CONFIRMED" || b.status === "PENDING"
    ).length,
  };
}

/**
 * Ranking da equipe no dia.
 *
 * Só é montado quando a empresa ligou a chave. Não existe caminho que devolva
 * o faturamento dos colegas com o ranking desligado — a checagem é aqui, na
 * consulta, e não na tela: esconder no componente deixaria o dado viajando até
 * o navegador de qualquer forma.
 */
export async function getTeamRanking(input: {
  companyId: string;
  date?: string;
}): Promise<RankedEntry[]> {
  const company = await db.company.findUnique({
    where: { id: input.companyId },
    select: { showTeamRanking: true, timezone: true },
  });
  if (!company?.showTeamRanking) return [];

  const date = input.date ?? todayInTimezone(company.timezone);

  const professionals = await db.professional.findMany({
    where: { companyId: input.companyId, isActive: true },
    select: { id: true, name: true },
  });
  if (professionals.length === 0) return [];

  const [bookingRows, posRows] = await Promise.all([
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT b."professionalId" AS pid,
              COALESCE(SUM(e."total"), 0)::float8 AS revenue
         FROM "booking" b
         LEFT JOIN "estimate" e ON e.id = b."estimateId"
        WHERE b."companyId" = $1
          AND b."scheduledDate" = $2
          AND b."status" = 'COMPLETED'
          AND b."professionalId" IS NOT NULL
        GROUP BY 1`,
      input.companyId,
      date
    ),
    db.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s."professionalId" AS pid,
              COALESCE(SUM(i."totalPrice"), 0)::float8 AS revenue
         FROM "pos_sale" s
         JOIN "sale_item" i ON i."saleId" = s.id
        WHERE s."companyId" = $1
          AND s."status" = 'COMPLETED'
          AND s."professionalId" IS NOT NULL
          AND s."createdAt" >= $2::date
          AND s."createdAt" < ($2::date + 1)
        GROUP BY 1`,
      input.companyId,
      date
    ),
  ]);

  const totals = new Map<string, number>();
  for (const row of [...bookingRows, ...posRows]) {
    const pid = String(row.pid ?? "");
    if (!pid) continue;
    totals.set(pid, (totals.get(pid) ?? 0) + num(row.revenue));
  }

  return rankTeam(
    professionals.map((p) => ({
      professionalId: p.id,
      name: p.name,
      revenue: Math.round((totals.get(p.id) ?? 0) * 100) / 100,
    }))
  );
}
