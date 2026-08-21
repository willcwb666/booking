import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Corrida de verdade: N clientes disputando o MESMO horário, ao mesmo tempo.
 *
 * ─── Por que isto não estava coberto ─────────────────────────────────────────
 *
 * Todos os testes de agendamento desta base chamam a action UMA vez e
 * verificam o resultado. Duplo agendamento não acontece assim — acontece
 * quando duas requisições leem "livre" antes de qualquer uma gravar. Ler o
 * código e concluir que o índice único resolve é razoável, mas não é prova: o
 * que decide é o comportamento do Postgres sob transações simultâneas, não a
 * leitura do arquivo.
 *
 * A trava é o índice `(agendaId, date, startTime, professionalId)` mais a
 * criação dentro de uma transação. `professionalId` nunca é nulo — dois NULLs
 * são distintos num índice único em Postgres, o que anularia a trava.
 *
 * O que estes casos exigem:
 *   · exatamente UM vencedor por slot disputado;
 *   · o perdedor recebe recusa clara, não erro cru do Prisma;
 *   · nada de meia reserva: o perdedor não deixa agendamento nem orçamento;
 *   · profissionais diferentes no mesmo horário não disputam entre si;
 *   · serviço longo trava a corrida INTEIRA, e não só o primeiro slot.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: async () => null } } }));
vi.mock("@/lib/session", () => ({
  getActiveSession: async () => null,
  getSessionTimeoutConfig: async () => ({}),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    enforceRateLimit: async () => ({
      allowed: true,
      remaining: 99,
      resetInSeconds: 60,
      limit: 100,
      message: "",
      degraded: false,
    }),
  };
});

vi.mock("@/lib/notifications", () => {
  const noop = async () => {};
  return {
    notifyBookingConfirmed: noop,
    notifyBookingCancelled: noop,
    notifyBookingReminder: noop,
    notifyCompanyNewBooking: noop,
    notifyStatusChanged: noop,
    notifyBookingCompletedWithInvoice: noop,
    notifyReviewRequest: noop,
  };
});

vi.mock("@/lib/webhooks", () => ({ triggerWebhooks: async () => {} }));

const P = "vitest-race";
const IDS = {
  company: `${P}-company`,
  user: `${P}-user`,
  agenda: `${P}-agenda`,
  config: `${P}-config`,
  service: `${P}-service`,
  type: `${P}-type`,
  proA: `${P}-pro-a`,
  proB: `${P}-pro-b`,
};
const SLUG = `${P}-slug`;

let db: typeof import("@/lib/db").db;
let createBooking: typeof import("@/server/actions/booking").createBookingAction;

async function cleanup() {
  await db.bookingCustomerDetail.deleteMany({ where: { booking: { companyId: IDS.company } } });
  await db.bookingHomeAccess.deleteMany({ where: { booking: { companyId: IDS.company } } });
  await db.notificationOutbox.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingSlot.deleteMany({ where: { agendaId: IDS.agenda } });
  await db.booking.deleteMany({ where: { companyId: IDS.company } });
  await db.estimateServiceType.deleteMany({ where: { estimate: { companyId: IDS.company } } });
  await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingConfig.deleteMany({ where: { companyId: IDS.company } });
  await db.agenda.deleteMany({ where: { companyId: IDS.company } });
  await db.professional.deleteMany({ where: { companyId: IDS.company } });
  await db.serviceType.deleteMany({ where: { id: IDS.type } });
  await db.service.deleteMany({ where: { id: IDS.service } });
  await db.companyUser.deleteMany({ where: { companyId: IDS.company } });
  await db.company.deleteMany({ where: { id: IDS.company } });
  await db.user.deleteMany({ where: { id: IDS.user } });
}

/** Duração do serviço em minutos — define quantos slots a corrida ocupa. */
let duracaoMin = 30;

async function seed() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  await db.user.create({
    data: { id: IDS.user, name: "Dono", email: `${IDS.user}@vitest.local`, emailVerified: true },
  });
  await db.company.create({
    data: {
      id: IDS.company,
      name: "Salão corrida",
      slug: SLUG,
      businessType: "BARBER",
      planId: plan.id,
      isActive: true,
      timezone: "America/Sao_Paulo",
    },
  });
  await db.companyUser.create({
    data: { companyId: IDS.company, userId: IDS.user, role: "OWNER", isActive: true },
  });
  await db.professional.createMany({
    data: [
      { id: IDS.proA, companyId: IDS.company, name: "Barbeiro A", isActive: true },
      { id: IDS.proB, companyId: IDS.company, name: "Barbeiro B", isActive: true },
    ],
  });
  await db.agenda.create({
    data: {
      id: IDS.agenda,
      companyId: IDS.company,
      name: "Principal",
      status: "ACTIVE",
      startDate: "2026-01-01",
      workingDays: [0, 1, 2, 3, 4, 5, 6],
      startTime: "00:00",
      endTime: "23:00",
      intervalMinutes: 30,
      createdById: IDS.user,
    },
  });
  await db.bookingConfig.create({
    data: {
      id: IDS.config,
      companyId: IDS.company,
      agendaId: IDS.agenda,
      name: "Corte",
      status: "PUBLISHED",
      createdById: IDS.user,
    },
  });
  await db.service.create({
    data: { id: IDS.service, companyId: IDS.company, name: "Cabelo", isActive: true, order: 0 },
  });
}

async function criaTipoServico() {
  await db.serviceType.deleteMany({ where: { id: IDS.type } });
  await db.serviceType.create({
    data: {
      id: IDS.type,
      companyId: IDS.company,
      serviceId: IDS.service,
      name: "Corte",
      price: "50.00",
      estimatedMinutes: duracaoMin,
      isActive: true,
      order: 0,
    },
  });
}

/** Amanhã no fuso local — data futura, portanto agendável. */
function amanha(): string {
  const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

/**
 * Um orçamento PENDING por concorrente, gravado direto.
 *
 * A action pública de orçamento tem regras próprias (rascunho, expiração) que
 * não são o objeto deste arquivo. O que precisa ser real aqui é a disputa pelo
 * slot — e ela começa depois do orçamento pronto.
 */
async function novoOrcamento(n: number): Promise<string> {
  const est = await db.estimate.create({
    data: {
      companyId: IDS.company,
      bookingConfigId: IDS.config,
      customerName: `Cliente ${n}`,
      customerEmail: `${P}-${n}@vitest.local`,
      subtotal: "50.00",
      total: "50.00",
      status: "PENDING",
      serviceTypes: {
        create: [{ serviceTypeId: IDS.type, quantity: 1, unitPrice: "50.00", subtotal: "50.00" }],
      },
    },
  });
  return est.id;
}

/** Payload de agendamento para um horário e profissional. */
function payload(estimateId: string, n: number, hora: string, professionalId?: string) {
  const [h, m] = hora.split(":").map(Number);
  const fim = new Date(2000, 0, 1, h, m + duracaoMin);
  const p2 = (x: number) => String(x).padStart(2, "0");

  const fd = new FormData();
  fd.set("estimateId", estimateId);
  fd.set("agendaId", IDS.agenda);
  fd.set("scheduledDate", amanha());
  fd.set("scheduledStartTime", hora);
  fd.set("scheduledEndTime", `${p2(fim.getHours())}:${p2(fim.getMinutes())}`);
  fd.set("firstName", `Cliente${n}`);
  fd.set("lastName", "Teste");
  fd.set("email", `${P}-${n}@vitest.local`);
  fd.set("phone", "11999990000");
  fd.set("address", "Rua Um, 1");
  fd.set("city", "São Paulo");
  fd.set("zip", "01000-000");
  fd.set("sendReminders", "false");
  fd.set("paymentMethod", "CASH_CHECK");
  fd.set("accessType", "SOMEONE_HOME");
  if (professionalId) fd.set("professionalId", professionalId);
  return fd;
}

type Resultado = { success: boolean; errors?: Record<string, string[]> };

d("corrida por horário (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ createBookingAction: createBooking } = await import("@/server/actions/booking"));
    await cleanup();
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  beforeEach(() => {
    duracaoMin = 30;
  });

  afterEach(async () => {
    // Limpeza no afterEach: no fim do `it` ela não roda quando o caso falha, e
    // o resíduo contamina a execução seguinte da suíte inteira.
    await db.bookingCustomerDetail.deleteMany({ where: { booking: { companyId: IDS.company } } });
    await db.bookingHomeAccess.deleteMany({ where: { booking: { companyId: IDS.company } } });
    await db.notificationOutbox.deleteMany({ where: { companyId: IDS.company } });
    await db.bookingSlot.deleteMany({ where: { agendaId: IDS.agenda } });
    await db.booking.deleteMany({ where: { companyId: IDS.company } });
    await db.estimateServiceType.deleteMany({ where: { estimate: { companyId: IDS.company } } });
    await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  });

  it("oito clientes ao mesmo tempo, no mesmo horário: só um leva", async () => {
    await criaTipoServico();
    const N = 8;
    const orcamentos = await Promise.all(
      Array.from({ length: N }, (_, i) => novoOrcamento(i))
    );

    // Disparo simultâneo de verdade: nada de `for await`.
    const res = (await Promise.all(
      orcamentos.map((e, i) => createBooking(payload(e, i, "10:00")))
    )) as Resultado[];

    const ganharam = res.filter((r) => r.success);
    expect(ganharam).toHaveLength(1);

    // E o banco concorda com a resposta.
    expect(await db.booking.count({ where: { companyId: IDS.company } })).toBe(1);
    expect(
      await db.bookingSlot.count({ where: { agendaId: IDS.agenda, startTime: "10:00" } })
    ).toBe(1);
  });

  it("o perdedor recebe recusa clara, não erro cru do banco", async () => {
    await criaTipoServico();
    const orcamentos = await Promise.all([novoOrcamento(20), novoOrcamento(21)]);

    const res = (await Promise.all(
      orcamentos.map((e, i) => createBooking(payload(e, 20 + i, "11:00")))
    )) as Resultado[];

    const perdedor = res.find((r) => !r.success);
    expect(perdedor).toBeDefined();
    const msg = perdedor!.errors?._?.join(" ") ?? "";
    expect(msg).toMatch(/já foi reservado|escolha outro/i);
    // Nada de vazar detalhe interno para o cliente final.
    expect(msg).not.toMatch(/P2002|prisma|constraint|Unique/i);
  });

  it("o perdedor não deixa meia reserva", async () => {
    await criaTipoServico();
    const orcamentos = await Promise.all([novoOrcamento(30), novoOrcamento(31)]);

    await Promise.all(orcamentos.map((e, i) => createBooking(payload(e, 30 + i, "12:00"))));

    // Um agendamento, um cliente, um conjunto de slots — e nenhum órfão.
    expect(await db.booking.count({ where: { companyId: IDS.company } })).toBe(1);
    expect(
      await db.bookingCustomerDetail.count({ where: { booking: { companyId: IDS.company } } })
    ).toBe(1);
  });

  it("profissionais diferentes no mesmo horário NÃO disputam", async () => {
    // O outro lado da trava: uma barbearia com dois barbeiros tem que vender
    // duas vezes as 13:00. Sem este caso, a correção "mais segura" — travar
    // por agenda em vez de por profissional — passaria despercebida.
    await criaTipoServico();
    const orcamentos = await Promise.all([novoOrcamento(40), novoOrcamento(41)]);

    const res = (await Promise.all([
      createBooking(payload(orcamentos[0], 40, "13:00", IDS.proA)),
      createBooking(payload(orcamentos[1], 41, "13:00", IDS.proB)),
    ])) as Resultado[];

    expect(res.filter((r) => r.success)).toHaveLength(2);
    expect(await db.booking.count({ where: { companyId: IDS.company } })).toBe(2);
  });

  it("serviço longo trava a corrida inteira, não só o primeiro slot", async () => {
    // 90 min numa grade de 30: ocupa 14:00, 14:30 e 15:00. Quem tentar 15:00
    // ao mesmo tempo colide no TERCEIRO slot — o primeiro dele está livre.
    duracaoMin = 90;
    await criaTipoServico();
    const orcamentos = await Promise.all([novoOrcamento(50), novoOrcamento(51)]);

    const res = (await Promise.all([
      createBooking(payload(orcamentos[0], 50, "14:00")),
      createBooking(payload(orcamentos[1], 51, "15:00")),
    ])) as Resultado[];

    expect(res.filter((r) => r.success)).toHaveLength(1);
    expect(await db.booking.count({ where: { companyId: IDS.company } })).toBe(1);
  });

  it("horários que não se cruzam continuam vendendo normalmente", async () => {
    // Controle positivo: sem ele, todos os casos acima passariam com a action
    // recusando tudo por qualquer motivo.
    await criaTipoServico();
    const orcamentos = await Promise.all([novoOrcamento(60), novoOrcamento(61)]);

    const res = (await Promise.all([
      createBooking(payload(orcamentos[0], 60, "16:00")),
      createBooking(payload(orcamentos[1], 61, "17:00")),
    ])) as Resultado[];

    expect(res.filter((r) => r.success)).toHaveLength(2);
  });
});
