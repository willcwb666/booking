import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * A consulta de resgate contra o Postgres real.
 *
 * O que se testa aqui não é a classificação — essa está coberta, pura, em
 * `src/lib/win-back.test.ts`. O que se testa é a SQL: `percentile_cont` sobre
 * `LAG`, os nomes de coluna em camelCase entre aspas, o `FILTER (WHERE ...)` e
 * o join com as preferências de notificação. Nada disso é verificado por
 * `tsc` — uma coluna com nome errado passa o build inteiro e explode em
 * produção, na tela do dono.
 *
 * O cenário é montado com intervalos conhecidos para a mediana ter uma resposta
 * verificável: 10, 10, 10 e um salto de 90. A média daria 30 e esconderia o
 * atraso; a mediana devolve 10 e o cliente aparece como atrasado — que é a
 * razão inteira de usar mediana.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

const P = "vitest-winback";
const IDS = {
  company: `${P}-company`,
  user: `${P}-user`,
  customer: `${P}-customer`,
  agenda: `${P}-agenda`,
  config: `${P}-config`,
};

let db: typeof import("@/lib/db").db;

/** "YYYY-MM-DD" de N dias atrás. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

async function cleanup() {
  await db.booking.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingConfig.deleteMany({ where: { companyId: IDS.company } });
  await db.agenda.deleteMany({ where: { companyId: IDS.company } });
  await db.customer.deleteMany({ where: { companyId: IDS.company } });
  await db.companyUser.deleteMany({ where: { companyId: IDS.company } });
  await db.company.deleteMany({ where: { id: IDS.company } });
  await db.user.deleteMany({ where: { id: IDS.user } });
}

/** Visitas em 130, 120, 110 e 100 dias atrás: intervalos de 10, 10, 10. */
const VISIT_DAYS_AGO = [130, 120, 110, 100];

async function seed() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  await db.user.create({
    data: { id: IDS.user, name: "Dono winback", email: `${IDS.user}@vitest.local`, emailVerified: true },
  });

  await db.company.create({
    data: {
      id: IDS.company,
      name: "Empresa winback",
      slug: `${P}-slug`,
      businessType: "BARBER",
      planId: plan.id,
      isActive: true,
    },
  });

  await db.companyUser.create({
    data: { companyId: IDS.company, userId: IDS.user, role: "OWNER", isActive: true },
  });

  await db.customer.create({
    data: {
      id: IDS.customer,
      companyId: IDS.company,
      firstName: "Cliente",
      lastName: "Sumido",
      email: `${IDS.customer}@vitest.local`,
      phone: "11999999999",
    },
  });

  await db.agenda.create({
    data: {
      id: IDS.agenda,
      companyId: IDS.company,
      name: "Agenda winback",
      startDate: daysAgo(400),
      endDate: daysAgo(-100),
      workingDays: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "18:00",
      intervalMinutes: 30,
      status: "ACTIVE",
      createdById: IDS.user,
    },
  });

  await db.bookingConfig.create({
    data: {
      id: IDS.config,
      companyId: IDS.company,
      agendaId: IDS.agenda,
      name: "Config winback",
      status: "PUBLISHED",
      createdById: IDS.user,
    },
  });

  for (const ago of VISIT_DAYS_AGO) {
    await db.booking.create({
      data: {
        companyId: IDS.company,
        bookingConfigId: IDS.config,
        agendaId: IDS.agenda,
        customerId: IDS.customer,
        scheduledDate: daysAgo(ago),
        scheduledStartTime: "10:00",
        scheduledEndTime: "10:30",
        status: "COMPLETED",
        paymentMethod: "CASH_CHECK",
        paymentStatus: "PAID",
      },
    });
  }
}

d("consulta de resgate (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    await cleanup();
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("a SQL executa e devolve o cliente semeado", async () => {
    // Metade do valor deste teste é só esta linha: a consulta usa nomes de
    // coluna em camelCase citados à mão, que nenhum tipo protege.
    const { getWinBackCustomers } = await import("@/server/queries/win-back");
    const rows = await getWinBackCustomers(IDS.company);

    expect(rows).toHaveLength(1);
    expect(rows[0].customerId).toBe(IDS.customer);
    expect(rows[0].name).toBe("Cliente Sumido");
  });

  it("a mediana dos intervalos vem do Postgres, não da média", async () => {
    const { getWinBackCustomers } = await import("@/server/queries/win-back");
    const [row] = await getWinBackCustomers(IDS.company);

    // Intervalos: 10, 10, 10. Média e mediana coincidem aqui de propósito —
    // o teste seguinte introduz o outlier que as separa.
    expect(row.cycleDays).toBe(10);
    expect(row.completedVisits).toBe(VISIT_DAYS_AGO.length);
    expect(row.daysSinceLast).toBe(100);
  });

  it("um intervalo longo isolado não apaga o atraso", async () => {
    // Acrescenta uma visita muito antiga: intervalos passam a ser 200, 10, 10,
    // 10. A média vira 57 dias e o cliente com 100 dias parados apareceria como
    // quase em dia. A mediana continua 10, e ele segue classificado como
    // perdido — que é o correto.
    const { getWinBackCustomers } = await import("@/server/queries/win-back");

    await db.booking.create({
      data: {
        companyId: IDS.company,
        bookingConfigId: IDS.config,
        agendaId: IDS.agenda,
        customerId: IDS.customer,
        scheduledDate: daysAgo(330),
        scheduledStartTime: "10:00",
        scheduledEndTime: "10:30",
        status: "COMPLETED",
        paymentMethod: "CASH_CHECK",
        paymentStatus: "PAID",
      },
    });

    const [row] = await getWinBackCustomers(IDS.company);
    expect(row.cycleDays).toBe(10);
    expect(row.status).toBe("LOST");
  });

  it("agendamento cancelado não conta como visita", async () => {
    // Só `COMPLETED` forma ritmo. Contar cancelamento inventaria um ciclo que
    // nunca existiu e mandaria oferta para quem nunca foi atendido.
    const { getWinBackCustomers } = await import("@/server/queries/win-back");

    await db.booking.create({
      data: {
        companyId: IDS.company,
        bookingConfigId: IDS.config,
        agendaId: IDS.agenda,
        customerId: IDS.customer,
        scheduledDate: daysAgo(1),
        scheduledStartTime: "10:00",
        scheduledEndTime: "10:30",
        status: "CANCELLED",
        paymentMethod: "CASH_CHECK",
        paymentStatus: "PENDING",
      },
    });

    const [row] = await getWinBackCustomers(IDS.company);
    expect(row.daysSinceLast).toBe(100);
  });
});
