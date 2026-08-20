import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cancelamento e estorno, contra o Postgres real.
 *
 * ─── Os dois defeitos que este arquivo fixa ──────────────────────────────────
 *
 * 1. O cancelamento de um agendamento PAGO não devolvia saldo de vale-presente
 *    nem crédito de sessão de plano. Isso só acontecia no fluxo de "pagamento
 *    falhou". Serviço de 100 pago com 40 de vale e 60 no cartão: cancelar
 *    devolvia 60 e engolia 40 — o cliente perdia dinheiro por desmarcar.
 *
 * 2. O estorno parcial era calculado sobre o total do ORÇAMENTO, não sobre o
 *    que foi cobrado. Com sinal de 30% sobre 100, o cartão viu 30 e o código
 *    pedia ao Stripe um estorno de 100 menos a taxa. O Stripe recusa estorno
 *    maior que a cobrança, então a action explodia com o agendamento já
 *    cancelado no banco: nem estornado, nem marcado como estornado.
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
    api: {
      getSession: async () => (currentUser ? { user: currentUser, session: {} } : null),
    },
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

/**
 * Stripe simulado.
 *
 * `amountReceived` é o que o gateway diz ter recebido — a autoridade que o
 * código passou a consultar. `refunds` registra o que foi pedido, e é onde se
 * verifica que o estorno não excede a cobrança.
 */
const stripeState = {
  amountReceived: 0,
  refunds: [] as Array<{ amount?: number }>,
};

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: {
      retrieve: async () => ({ amount_received: stripeState.amountReceived }),
      create: async () => ({ id: "pi_fake", client_secret: "cs_fake" }),
    },
    refunds: {
      create: async (args: { amount?: number }) => {
        // O Stripe recusa estorno maior que a cobrança. Simular isso é o único
        // jeito de o teste reproduzir a explosão original.
        const asked = args.amount ?? stripeState.amountReceived;
        if (asked > stripeState.amountReceived) {
          throw new Error(
            `Refund amount (${asked}) is greater than charge amount (${stripeState.amountReceived})`
          );
        }
        stripeState.refunds.push(args);
        return { amount: asked };
      },
    },
  },
}));

const P = "vitest-money";
const IDS = {
  company: `${P}-company`,
  user: `${P}-user`,
  agenda: `${P}-agenda`,
  config: `${P}-config`,
  booking: `${P}-booking`,
  estimate: `${P}-estimate`,
  card: `${P}-giftcard`,
};

let db: typeof import("@/lib/db").db;

async function cleanup() {
  await db.$executeRawUnsafe(`DELETE FROM "loyalty_account" WHERE "companyId" = $1`, IDS.company);
  await db.$executeRawUnsafe(`DELETE FROM "loyalty_program" WHERE "companyId" = $1`, IDS.company);
  await db.bookingCustomerDetail.deleteMany({ where: { bookingId: IDS.booking } });
  await db.giftCardRedemption.deleteMany({ where: { giftCardId: IDS.card } });
  await db.giftCard.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingSlot.deleteMany({ where: { agendaId: IDS.agenda } });
  await db.booking.deleteMany({ where: { companyId: IDS.company } });
  await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingConfig.deleteMany({ where: { companyId: IDS.company } });
  await db.agenda.deleteMany({ where: { companyId: IDS.company } });
  await db.companyUser.deleteMany({ where: { companyId: IDS.company } });
  await db.company.deleteMany({ where: { id: IDS.company } });
  await db.user.deleteMany({ where: { id: IDS.user } });
}

async function seedBase() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  await db.user.create({
    data: { id: IDS.user, name: "Dono", email: `${IDS.user}@vitest.local`, emailVerified: true },
  });
  await db.company.create({
    data: {
      id: IDS.company,
      name: "Salão money",
      slug: `${P}-slug`,
      businessType: "BARBER",
      planId: plan.id,
      isActive: true,
      // Cancelamento tardio com taxa: é o caminho do estorno PARCIAL.
      minCancellationNoticeHours: 24,
      cancellationFee: "10.00",
    },
  });
  await db.companyUser.create({
    data: { companyId: IDS.company, userId: IDS.user, role: "OWNER", isActive: true },
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
      endTime: "20:00",
      intervalMinutes: 60,
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
}

/**
 * Agendamento daqui a 3 horas — dentro da janela mínima de 24 h, portanto
 * cancelamento TARDIO, que é o caminho do estorno parcial.
 *
 * A primeira versão devolvia só a data de "agora + 12 h" via `toISOString()`
 * (UTC) e deixava a hora fixa em 10:00 (local). As duas se contradiziam: em
 * fuso negativo, a data virava a de amanhã enquanto a hora continuava sendo a
 * de hoje, e o agendamento caía 27 h à frente — fora da janela. O teste passava
 * ou falhava conforme a HORA DO DIA em que a suíte rodasse.
 */
function soon(): { date: string; time: string } {
  const t = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`,
    time: `${p(t.getHours())}:${p(t.getMinutes())}`,
  };
}

async function makePaidBooking(opts: { giftAmount?: number; chargedAmount: number }) {
  const when = soon();
  await db.estimate.create({
    data: {
      id: IDS.estimate,
      companyId: IDS.company,
      bookingConfigId: IDS.config,
      customerName: "Cliente",
      customerEmail: `${P}@vitest.local`,
      subtotal: "100.00",
      total: "100.00",
      status: "CONVERTED",
    },
  });

  await db.booking.create({
    data: {
      id: IDS.booking,
      companyId: IDS.company,
      estimateId: IDS.estimate,
      bookingConfigId: IDS.config,
      agendaId: IDS.agenda,
      scheduledDate: when.date,
      scheduledStartTime: when.time,
      scheduledEndTime: when.time,
      status: "CONFIRMED",
      paymentMethod: "CARD",
      paymentStatus: "PAID",
      stripePaymentIntentId: "pi_fake",
    },
  });

  if (opts.giftAmount) {
    await db.giftCard.create({
      data: {
        id: IDS.card,
        companyId: IDS.company,
        code: `${P}-CODE`,
        initialBalance: "100.00",
        currentBalance: String(100 - opts.giftAmount),
        status: "ACTIVE",
      },
    });
    await db.giftCardRedemption.create({
      data: {
        giftCardId: IDS.card,
        bookingId: IDS.booking,
        amount: String(opts.giftAmount),
      },
    });
  }

  stripeState.amountReceived = Math.round(opts.chargedAmount * 100);
}

d("cancelamento e estorno (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    await cleanup();
    await seedBase();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  beforeEach(async () => {
    currentUser = { id: IDS.user, email: `${IDS.user}@vitest.local`, name: "Dono" };
    stripeState.refunds = [];
  });

  afterEach(async () => {
    // Limpeza no afterEach, e não no fim do `it`: um caso que falha no meio
    // deixaria resíduo no banco e contaminaria a próxima execução da suíte —
    // que foi exatamente o que aconteceu ao verificar estes testes.
    await db.bookingCustomerDetail.deleteMany({ where: { bookingId: IDS.booking } });
    await db.$executeRawUnsafe(`DELETE FROM "loyalty_account" WHERE "companyId" = $1`, IDS.company);
    await db.$executeRawUnsafe(`DELETE FROM "loyalty_program" WHERE "companyId" = $1`, IDS.company);
    await db.giftCardRedemption.deleteMany({ where: { giftCardId: IDS.card } });
    await db.giftCard.deleteMany({ where: { companyId: IDS.company } });
    await db.bookingSlot.deleteMany({ where: { agendaId: IDS.agenda } });
    await db.booking.deleteMany({ where: { companyId: IDS.company } });
    await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  });

  const cancel = async () => {
    const m = await import("@/server/actions/booking");
    const fd = new FormData();
    fd.set("bookingId", IDS.booking);
    fd.set("companySlug", `${P}-slug`);
    fd.set("reason", "teste");
    return m.cancelBookingAction(fd);
  };

  it("devolve o saldo do vale-presente ao cancelar", async () => {
    // 100 de serviço: 40 de vale e 60 no cartão.
    await makePaidBooking({ giftAmount: 40, chargedAmount: 60 });

    const res = await cancel();
    expect(res.success).toBe(true);

    const card = await db.giftCard.findUnique({ where: { id: IDS.card } });
    // Saldo de volta aos 100 e cartão reativado.
    expect(Number(card?.currentBalance)).toBe(100);
    expect(card?.status).toBe("ACTIVE");
    // E o resgate sai, para não creditar duas vezes numa segunda passada.
    expect(await db.giftCardRedemption.count({ where: { bookingId: IDS.booking } })).toBe(0);
  });

  it("estorna sobre o valor COBRADO, não sobre o total do orçamento", async () => {
    /**
     * Sinal de 30% sobre 100: o cartão viu 30. Com taxa de cancelamento de 10,
     * o cliente tem 20 a receber.
     *
     * O cálculo antigo pedia 90 (100 do orçamento menos a taxa) e o Stripe
     * recusava — o mock reproduz a recusa.
     */
    await makePaidBooking({ chargedAmount: 30 });

    const res = await cancel();
    expect(res.success).toBe(true);

    expect(stripeState.refunds).toHaveLength(1);
    expect(stripeState.refunds[0].amount).toBe(2000); // 20,00 em centavos

    const booking = await db.booking.findUnique({ where: { id: IDS.booking } });
    expect(booking?.paymentStatus).toBe("REFUNDED");
    // O quanto e o quando passam a ficar registrados neste caminho também.
    expect(Number(booking?.refundAmount)).toBe(20);
    expect(booking?.refundedAt).toBeInstanceOf(Date);
  });

  it("a taxa nunca transforma o estorno em cobrança extra", async () => {
    // Cobrado 5, taxa de 10: o piso é zero, não -5.
    await makePaidBooking({ chargedAmount: 5 });

    const res = await cancel();
    expect(res.success).toBe(true);
    expect(stripeState.refunds).toHaveLength(0);
    expect(Number((await db.booking.findUnique({ where: { id: IDS.booking } }))?.refundAmount)).toBe(0);
  });

  it("pontos de fidelidade são creditados uma vez só", async () => {
    /**
     * O crédito não tinha guarda nenhuma, e concluir o atendimento duas vezes
     * — dois cliques, ou reabrir e concluir de novo — somava os pontos duas
     * vezes. Ponto vira desconto e vira serviço: creditar em dobro é emitir
     * dinheiro.
     */
    await makePaidBooking({ chargedAmount: 100 });
    await db.$executeRawUnsafe(
      `INSERT INTO "loyalty_program" (id, "companyId", "isEnabled", "pointsPerCurrency", "createdAt", "updatedAt")
       VALUES ($1, $2, true, 1, NOW(), NOW())
       ON CONFLICT ("companyId") DO UPDATE SET "isEnabled" = true, "pointsPerCurrency" = 1`,
      `lp_${P}`,
      IDS.company
    );
    await db.bookingCustomerDetail.create({
      data: {
        bookingId: IDS.booking,
        firstName: "Cliente",
        lastName: "Fiel",
        email: `${P}-fiel@vitest.local`,
        phone: "41999999999",
        address: "Rua 1",
        city: "Curitiba",
        zip: "80000-000",
      },
    });

    const { awardLoyaltyPointsForBooking } = await import("@/lib/loyalty");
    await awardLoyaltyPointsForBooking(IDS.booking, 100);
    await awardLoyaltyPointsForBooking(IDS.booking, 100);

    const rows = await db.$queryRawUnsafe<Array<{ points: number }>>(
      `SELECT "points" FROM "loyalty_account" WHERE "companyId" = $1 AND "customerEmail" = $2`,
      IDS.company,
      `${P}-fiel@vitest.local`
    );
    expect(Number(rows[0]?.points)).toBe(100);
  });

  it("devolver crédito duas vezes não credita duas vezes", async () => {
    // O webhook do gateway reentrega; a devolução tem de ser idempotente.
    await makePaidBooking({ giftAmount: 40, chargedAmount: 60 });
    const { restoreBookingCredits } = await import("@/lib/booking-reversal");

    await db.$transaction(async (tx) => {
      await restoreBookingCredits(tx, IDS.booking);
      await restoreBookingCredits(tx, IDS.booking);
    });

    const card = await db.giftCard.findUnique({ where: { id: IDS.card } });
    expect(Number(card?.currentBalance)).toBe(100);
  });
});
