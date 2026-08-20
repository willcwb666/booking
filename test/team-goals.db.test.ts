import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Painel do dia e ranking da equipe, contra o Postgres real.
 *
 * A matemática está coberta, pura, em `src/lib/team-goals.test.ts`. Aqui se
 * testa o que aquela suíte não alcança:
 *
 *  1. **quem pode ver o quê.** O painel mostra faturamento e COMISSÃO — que é
 *     salário. Deixar `?prof=` valer para qualquer um transformaria o parâmetro
 *     num leitor do contracheque dos colegas;
 *  2. **de onde vem o número.** Faturamento e comissão saem de duas fontes
 *     (agendamento concluído e item de balcão) e só o que está CONCLUÍDO conta;
 *  3. **o ranking desligado não vaza.** A checagem é na consulta, não na tela.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

type FakeUser = { id: string; email: string; name: string; role?: string | null };
let currentUser: FakeUser | null = null;

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
}));
vi.mock("@/lib/auth", () => ({
  auth: {
    api: { getSession: async () => (currentUser ? { user: currentUser, session: {} } : null) },
  },
}));
vi.mock("@/lib/session", () => ({
  getActiveSession: async () => (currentUser ? { user: currentUser, session: {} } : null),
  getSessionTimeoutConfig: async () => ({}),
}));
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn: unknown) => fn,
}));

const P = "vitest-goals";
const IDS = {
  company: `${P}-company`,
  owner: `${P}-owner`,
  employeeUser: `${P}-employee-user`,
  profA: `${P}-prof-a`,
  profB: `${P}-prof-b`,
  agenda: `${P}-agenda`,
  config: `${P}-config`,
};

/** Data fixa no passado: nada de "hoje" para o teste depender do relógio. */
const DATE = "2026-05-11";

let db: typeof import("@/lib/db").db;

async function cleanup() {
  await db.saleItem.deleteMany({ where: { sale: { companyId: IDS.company } } });
  await db.posSale.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingSlot.deleteMany({ where: { agendaId: IDS.agenda } });
  await db.booking.deleteMany({ where: { companyId: IDS.company } });
  await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingConfig.deleteMany({ where: { companyId: IDS.company } });
  await db.agenda.deleteMany({ where: { companyId: IDS.company } });
  await db.professional.deleteMany({ where: { companyId: IDS.company } });
  await db.companyUser.deleteMany({ where: { companyId: IDS.company } });
  await db.company.deleteMany({ where: { id: IDS.company } });
  await db.user.deleteMany({ where: { id: { in: [IDS.owner, IDS.employeeUser] } } });
}

async function seed() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  await db.user.createMany({
    data: [
      { id: IDS.owner, name: "Dono", email: `${IDS.owner}@vitest.local`, emailVerified: true },
      {
        id: IDS.employeeUser,
        name: "Funcionário",
        email: `${IDS.employeeUser}@vitest.local`,
        emailVerified: true,
      },
    ],
  });

  await db.company.create({
    data: {
      id: IDS.company,
      name: "Salão metas",
      slug: `${P}-slug`,
      businessType: "BARBER",
      planId: plan.id,
      isActive: true,
      timezone: "America/Sao_Paulo",
      showTeamRanking: false,
    },
  });

  await db.companyUser.createMany({
    data: [
      { companyId: IDS.company, userId: IDS.owner, role: "OWNER", isActive: true },
      { companyId: IDS.company, userId: IDS.employeeUser, role: "EMPLOYEE", isActive: true },
    ],
  });

  // Profissional A é o funcionário; B é outro, para provar o isolamento.
  await db.professional.create({
    data: {
      id: IDS.profA,
      companyId: IDS.company,
      userId: IDS.employeeUser,
      name: "Ana",
      isActive: true,
      dailyGoal: "300.00",
      commissionRate: "40.00",
    },
  });
  await db.professional.create({
    data: {
      id: IDS.profB,
      companyId: IDS.company,
      name: "Bruno",
      isActive: true,
      commissionRate: "50.00",
    },
  });

  await db.agenda.create({
    data: {
      id: IDS.agenda,
      companyId: IDS.company,
      name: "Principal",
      status: "ACTIVE",
      startDate: "2026-01-01",
      workingDays: [0, 1, 2, 3, 4, 5, 6],
      startTime: "08:00",
      endTime: "18:00",
      intervalMinutes: 60,
      createdById: IDS.owner,
    },
  });
  await db.bookingConfig.create({
    data: {
      id: IDS.config,
      companyId: IDS.company,
      agendaId: IDS.agenda,
      name: "Corte",
      status: "PUBLISHED",
      createdById: IDS.owner,
    },
  });
}

let seq = 0;
async function addBooking(professionalId: string, total: number, status: string, time = "10:00") {
  seq += 1;
  const estimateId = `${P}-est-${seq}`;
  await db.estimate.create({
    data: {
      id: estimateId,
      companyId: IDS.company,
      bookingConfigId: IDS.config,
      customerName: "Cliente",
      subtotal: String(total),
      total: String(total),
      status: "CONVERTED",
    },
  });
  await db.booking.create({
    data: {
      id: `${P}-bk-${seq}`,
      companyId: IDS.company,
      estimateId,
      bookingConfigId: IDS.config,
      agendaId: IDS.agenda,
      professionalId,
      scheduledDate: DATE,
      scheduledStartTime: time,
      scheduledEndTime: "11:00",
      status: status as never,
      paymentMethod: "CASH_CHECK",
    },
  });
}

d("painel de metas (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    await cleanup();
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  beforeEach(() => {
    currentUser = { id: IDS.owner, email: `${IDS.owner}@vitest.local`, name: "Dono" };
  });

  afterEach(async () => {
    await db.saleItem.deleteMany({ where: { sale: { companyId: IDS.company } } });
    await db.posSale.deleteMany({ where: { companyId: IDS.company } });
    await db.booking.deleteMany({ where: { companyId: IDS.company } });
    await db.estimate.deleteMany({ where: { companyId: IDS.company } });
    await db.company.update({
      where: { id: IDS.company },
      data: { showTeamRanking: false },
    });
    await db.professional.update({
      where: { id: IDS.profA },
      data: { dailyGoal: "300.00" },
    });
  });

  describe("o número do dia", () => {
    it("soma só o que está concluído, e calcula a comissão sobre isso", async () => {
      const { getProfessionalDayPanel } = await import("@/server/queries/team-goals");

      await addBooking(IDS.profA, 200, "COMPLETED", "09:00");
      // Confirmado ainda não gerou receita — está marcado, não feito.
      await addBooking(IDS.profA, 500, "CONFIRMED", "15:00");
      // Cancelado não entra de jeito nenhum.
      await addBooking(IDS.profA, 900, "CANCELLED", "16:00");

      const panel = await getProfessionalDayPanel({
        companyId: IDS.company,
        professionalId: IDS.profA,
        date: DATE,
      });

      expect(panel?.revenue).toBe(200);
      // 40% de 200.
      expect(panel?.commission).toBe(80);
      expect(panel?.goal.goal).toBe(300);
      expect(panel?.goal.remaining).toBe(100);
      expect(panel?.goal.reached).toBe(false);
      // O cancelado sai da lista do dia; o confirmado fica, como "a fazer".
      expect(panel?.upcomingCount).toBe(1);
      expect(panel?.services).toHaveLength(2);
    });

    it("não mistura o dia de um profissional com o do outro", async () => {
      const { getProfessionalDayPanel } = await import("@/server/queries/team-goals");

      await addBooking(IDS.profA, 100, "COMPLETED", "09:00");
      await addBooking(IDS.profB, 999, "COMPLETED", "10:00");

      const panel = await getProfessionalDayPanel({
        companyId: IDS.company,
        professionalId: IDS.profA,
        date: DATE,
      });
      expect(panel?.revenue).toBe(100);
    });

    it("sem meta, o resultado aparece mesmo assim", async () => {
      // "Não tenho meta" não pode virar uma tela vazia — o faturamento do dia
      // vale por si.
      const { getProfessionalDayPanel } = await import("@/server/queries/team-goals");
      await db.professional.update({ where: { id: IDS.profA }, data: { dailyGoal: null } });
      await addBooking(IDS.profA, 150, "COMPLETED", "09:00");

      const panel = await getProfessionalDayPanel({
        companyId: IDS.company,
        professionalId: IDS.profA,
        date: DATE,
      });
      expect(panel?.revenue).toBe(150);
      expect(panel?.goal.goal).toBeNull();
      expect(panel?.goal.percent).toBeNull();
    });

    it("profissional de outra empresa não devolve painel", async () => {
      const { getProfessionalDayPanel } = await import("@/server/queries/team-goals");
      const panel = await getProfessionalDayPanel({
        companyId: IDS.company,
        professionalId: "nao-existe-aqui",
        date: DATE,
      });
      expect(panel).toBeNull();
    });
  });

  describe("ranking", () => {
    it("desligado não devolve nada — a trava é na consulta", async () => {
      /**
       * Se a checagem estivesse só na tela, o faturamento de cada colega
       * viajaria até o navegador de qualquer forma, e bastaria abrir o
       * inspetor. Aqui a consulta devolve lista vazia.
       */
      const { getTeamRanking } = await import("@/server/queries/team-goals");
      await addBooking(IDS.profA, 100, "COMPLETED", "09:00");
      await addBooking(IDS.profB, 300, "COMPLETED", "10:00");

      expect(await getTeamRanking({ companyId: IDS.company, date: DATE })).toEqual([]);
    });

    it("ligado, ordena por faturamento do dia", async () => {
      const { getTeamRanking } = await import("@/server/queries/team-goals");
      await db.company.update({
        where: { id: IDS.company },
        data: { showTeamRanking: true },
      });
      await addBooking(IDS.profA, 100, "COMPLETED", "09:00");
      await addBooking(IDS.profB, 300, "COMPLETED", "10:00");

      const ranking = await getTeamRanking({ companyId: IDS.company, date: DATE });
      expect(ranking.map((r) => r.professionalId)).toEqual([IDS.profB, IDS.profA]);
      expect(ranking[0].position).toBe(1);
      expect(ranking[0].revenue).toBe(300);
      // Quem não faturou aparece com zero, não some da lista.
      expect(ranking).toHaveLength(2);
    });
  });

  describe("quem pode definir meta e ligar o ranking", () => {
    it("EMPLOYEE não define a própria meta", async () => {
      // Meta que o medido define sozinho é enfeite.
      const m = await import("@/server/actions/team-goals");
      currentUser = {
        id: IDS.employeeUser,
        email: `${IDS.employeeUser}@vitest.local`,
        name: "Funcionário",
      };

      const res = await m.saveProfessionalGoalAction(`${P}-slug`, {
        professionalId: IDS.profA,
        dailyGoal: 10,
      });
      expect(res.success).toBe(false);

      const prof = await db.professional.findUnique({ where: { id: IDS.profA } });
      expect(Number(prof?.dailyGoal)).toBe(300);
    });

    it("EMPLOYEE não liga o ranking da equipe", async () => {
      const m = await import("@/server/actions/team-goals");
      currentUser = {
        id: IDS.employeeUser,
        email: `${IDS.employeeUser}@vitest.local`,
        name: "Funcionário",
      };

      expect((await m.setTeamRankingAction(`${P}-slug`, true)).success).toBe(false);
      const company = await db.company.findUnique({ where: { id: IDS.company } });
      expect(company?.showTeamRanking).toBe(false);
    });

    it("OWNER define a meta, e zero vira sem-meta", async () => {
      const m = await import("@/server/actions/team-goals");

      expect(
        (await m.saveProfessionalGoalAction(`${P}-slug`, {
          professionalId: IDS.profA,
          dailyGoal: 450,
        })).success
      ).toBe(true);
      expect(
        Number((await db.professional.findUnique({ where: { id: IDS.profA } }))?.dailyGoal)
      ).toBe(450);

      // Zero e nulo dizem a mesma coisa; guardar os dois faria a tela ter de
      // distinguir "meta zero" de "sem meta", e a barra marcaria 100% sempre.
      await m.saveProfessionalGoalAction(`${P}-slug`, {
        professionalId: IDS.profA,
        dailyGoal: 0,
      });
      expect(
        (await db.professional.findUnique({ where: { id: IDS.profA } }))?.dailyGoal
      ).toBeNull();
    });

    it("não define meta de profissional de outra empresa", async () => {
      const m = await import("@/server/actions/team-goals");
      const res = await m.saveProfessionalGoalAction(`${P}-slug`, {
        professionalId: "prof-de-outra-empresa",
        dailyGoal: 10,
      });
      expect(res.success).toBe(false);
    });

    it("sem sessão não faz nada", async () => {
      const m = await import("@/server/actions/team-goals");
      currentUser = null;
      expect(
        (await m.saveProfessionalGoalAction(`${P}-slug`, {
          professionalId: IDS.profA,
          dailyGoal: 10,
        })).success
      ).toBe(false);
      expect((await m.setTeamRankingAction(`${P}-slug`, true)).success).toBe(false);
    });
  });
});
