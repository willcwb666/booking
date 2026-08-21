import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O dinheiro do fechamento do atendimento, contra o Postgres real.
 *
 * ─── Os quatro defeitos que este arquivo fixa ────────────────────────────────
 *
 * 1. `completeBookingWithAdjustmentsAction` não validava NADA.
 *
 *    Server action é endpoint HTTP: os números chegam de fora, não do
 *    formulário. Sem trava, qualquer membro da empresa podia mandar desconto
 *    percentual de 999 (total zerado e estorno do valor cheio) ou desconto
 *    NEGATIVO — que infla a conta, porque `subtotal - (-500)` é
 *    `subtotal + 500`. E a comissão é carimbada sobre o total resultante:
 *    inflar a conta inflava junto a comissão de quem fechou.
 *
 * 2. O estorno da diferença era calculado sobre o total do ORÇAMENTO.
 *
 *    Com sinal de 30% sobre 100, o cartão recebeu 30. Um desconto de 50 no
 *    fechamento pedia estorno de 50 sobre uma cobrança de 30; o Stripe recusa,
 *    e o `catch` engolia. A tela dizia "concluído" e o cliente nunca via o
 *    dinheiro. É o mesmo defeito já corrigido no cancelamento — aqui
 *    continuava de pé.
 *
 * 3. O estorno rodava ANTES de gravar.
 *
 *    Falhando a gravação depois, o dinheiro tinha voltado e o atendimento
 *    seguia em aberto pelo valor cheio. Estorno não tem desfazer; gravação tem.
 *
 * 4. A falha do estorno sumia. Agora volta como `warning` para quem fechou.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

type FakeUser = { id: string; email: string; name: string; role?: string | null };
let currentUser: FakeUser | null = null;

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => (currentUser ? { user: currentUser, session: {} } : null) } },
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

/**
 * Stripe simulado. `amountReceived` é o que o gateway diz ter recebido — a
 * autoridade que o código passou a consultar. `refunds` registra o pedido.
 */
const stripeState = { amountReceived: 0, refunds: [] as Array<{ amount?: number }> };

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: {
      retrieve: async () => ({ amount_received: stripeState.amountReceived }),
      create: async () => ({ id: "pi_fake", client_secret: "cs_fake" }),
    },
    refunds: {
      create: async (args: { amount?: number }) => {
        // O Stripe recusa estorno maior que a cobrança. Simular isso é o único
        // jeito de o teste reproduzir a falha original.
        const asked = args.amount ?? 0;
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

const P = "vitest-closemoney";
const IDS = {
  company: `${P}-company`,
  user: `${P}-user`,
  pro: `${P}-pro`,
  agenda: `${P}-agenda`,
  config: `${P}-config`,
  estimate: `${P}-estimate`,
  booking: `${P}-booking`,
};
const SLUG = `${P}-slug`;

let db: typeof import("@/lib/db").db;
let complete: typeof import("@/server/actions/booking").completeBookingWithAdjustmentsAction;

async function cleanup() {
  await db.notificationOutbox.deleteMany({ where: { bookingId: IDS.booking } });
  await db.booking.deleteMany({ where: { companyId: IDS.company } });
  await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingConfig.deleteMany({ where: { companyId: IDS.company } });
  await db.agenda.deleteMany({ where: { companyId: IDS.company } });
  await db.professional.deleteMany({ where: { companyId: IDS.company } });
  await db.companyUser.deleteMany({ where: { companyId: IDS.company } });
  await db.company.deleteMany({ where: { id: IDS.company } });
  await db.user.deleteMany({ where: { id: IDS.user } });
}

async function seed() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  await db.user.create({
    data: { id: IDS.user, name: "Dono", email: `${IDS.user}@vitest.local`, emailVerified: true },
  });
  await db.company.create({
    data: {
      id: IDS.company,
      name: "Salão fechamento",
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
  await db.professional.create({
    data: { id: IDS.pro, companyId: IDS.company, name: "Barbeiro", commissionRate: "50", isActive: true },
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
}

/** "Ontem" no fuso da empresa — data passada, portanto concluível. */
function ontem(): string {
  const t = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

/** Agendamento de 100, pago no cartão pelo valor informado. */
async function agendamentoEmAndamento(chargedOnline: number) {
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
      professionalId: IDS.pro,
      scheduledDate: ontem(),
      scheduledStartTime: "10:00",
      scheduledEndTime: "11:00",
      status: "IN_PROGRESS",
      paymentMethod: "CARD",
      paymentStatus: "PAID",
      stripePaymentIntentId: "pi_fake",
    },
  });
  stripeState.amountReceived = Math.round(chargedOnline * 100);
}

const base = {
  bookingId: IDS.booking,
  companySlug: SLUG,
  additionalItems: [] as Array<{ description: string; amount: number }>,
  discountType: "FIXED" as const,
  discountValue: 0,
};

d("dinheiro do fechamento do atendimento (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ completeBookingWithAdjustmentsAction: complete } = await import(
      "@/server/actions/booking"
    ));
    await cleanup();
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  beforeEach(() => {
    currentUser = { id: IDS.user, email: `${IDS.user}@vitest.local`, name: "Dono" };
    stripeState.refunds = [];
  });

  afterEach(async () => {
    // Limpeza no afterEach: no fim do `it` ela não roda quando o caso falha, e
    // o resíduo contamina a execução seguinte da suíte inteira.
    await db.notificationOutbox.deleteMany({ where: { bookingId: IDS.booking } });
    await db.booking.deleteMany({ where: { companyId: IDS.company } });
    await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  });

  describe("validação da entrada", () => {
    it("recusa desconto percentual acima de 100%", async () => {
      await agendamentoEmAndamento(100);
      const res = await complete({ ...base, discountType: "PERCENTAGE", discountValue: 999 });

      expect(res.success).toBe(false);
      const depois = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
      expect(depois.status).toBe("IN_PROGRESS");
      expect(stripeState.refunds).toEqual([]);
    });

    it("recusa desconto NEGATIVO, que inflaria a conta", async () => {
      await agendamentoEmAndamento(100);
      const res = await complete({ ...base, discountValue: -500 });

      expect(res.success).toBe(false);
      const est = await db.estimate.findUniqueOrThrow({ where: { id: IDS.estimate } });
      expect(Number(est.total)).toBe(100);
    });

    it("recusa item adicional de valor negativo", async () => {
      await agendamentoEmAndamento(100);
      const res = await complete({
        ...base,
        additionalItems: [{ description: "estorno disfarçado", amount: -300 }],
      });

      expect(res.success).toBe(false);
    });

    it("recusa item adicional sem descrição", async () => {
      await agendamentoEmAndamento(100);
      const res = await complete({ ...base, additionalItems: [{ description: "  ", amount: 10 }] });
      expect(res.success).toBe(false);
    });
  });

  describe("estorno da diferença", () => {
    it("não pede ao Stripe mais do que entrou", async () => {
      // Sinal de 30% sobre 100: o cartão recebeu 30. Desconto de 50 no
      // fechamento pediria 50 — o Stripe recusaria e o cliente ficaria sem o
      // dinheiro, em silêncio.
      await agendamentoEmAndamento(30);

      const res = await complete({ ...base, discountValue: 50 });

      expect(res.success).toBe(true);
      expect(stripeState.refunds).toHaveLength(1);
      expect(stripeState.refunds[0].amount).toBe(3000);
    });

    it("estorna o valor exato quando cabe na cobrança", async () => {
      await agendamentoEmAndamento(100);

      const res = await complete({ ...base, discountValue: 25 });

      expect(res.success).toBe(true);
      expect(stripeState.refunds[0].amount).toBe(2500);

      const depois = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
      expect(Number(depois.refundAmount)).toBe(25);
      expect(depois.refundedAt).not.toBeNull();
    });

    it("conclui e grava mesmo sem desconto nenhum", async () => {
      // Controle positivo: sem ele, tudo acima passaria com a action quebrada.
      await agendamentoEmAndamento(100);

      const res = await complete({ ...base });

      expect(res.success).toBe(true);
      const depois = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
      expect(depois.status).toBe("COMPLETED");
      expect(stripeState.refunds).toEqual([]);
    });
  });

  describe("comissão", () => {
    it("é carimbada sobre o total FINAL, não sobre o do orçamento", async () => {
      await agendamentoEmAndamento(100);

      await complete({ ...base, discountValue: 40 });

      const depois = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
      // 100 − 40 = 60; taxa de 50% ⇒ 30.
      expect(Number(depois.commissionAmount)).toBe(30);
      expect(Number(depois.commissionRate)).toBe(50);
    });

    it("não muda quando a taxa do profissional muda depois", async () => {
      await agendamentoEmAndamento(100);
      await complete({ ...base });

      await db.professional.update({
        where: { id: IDS.pro },
        data: { commissionRate: "90" },
      });

      const depois = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
      expect(Number(depois.commissionAmount)).toBe(50);

      await db.professional.update({
        where: { id: IDS.pro },
        data: { commissionRate: "50" },
      });
    });
  });

  it("concluir duas vezes não repete nada", async () => {
    await agendamentoEmAndamento(100);

    expect((await complete({ ...base, discountValue: 10 })).success).toBe(true);
    const segunda = await complete({ ...base, discountValue: 10 });

    expect(segunda.success).toBe(false);
    expect(stripeState.refunds).toHaveLength(1);
  });
});
