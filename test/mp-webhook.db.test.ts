import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Webhook do Mercado Pago, contra o Postgres real.
 *
 * ─── O defeito que este arquivo fixa ─────────────────────────────────────────
 *
 * O webhook marcava o agendamento como PAGO olhando SÓ para
 * `payment.status === "approved"`. O `transaction_amount`, que vem na mesma
 * resposta, nunca era lido — e o valor devido não era gravado em lugar nenhum,
 * então não havia nem contra o que conferir.
 *
 * No Stripe o evento chega amarrado ao PaymentIntent que nós criamos, com o
 * valor que nós definimos. No MP o pagamento é buscado por id e o valor volta
 * do gateway. Um pagamento aprovado por 1 real num agendamento de 200
 * confirmava o agendamento inteiro.
 *
 * O caso central aqui é o PIX curto. Os outros dois existem para provar que a
 * conferência não fechou a porta para pagamento legítimo.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

/** O que o MP responde quando o webhook busca o pagamento por id. */
const mpPayment = { status: "approved", transaction_amount: 0 as number | undefined };

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {},
  Payment: class {
    async get() {
      return mpPayment;
    }
  },
}));

// O token guardado é cifrado; aqui ele é o próprio texto.
vi.mock("@/lib/encrypt", () => ({
  encrypt: (v: string) => v,
  decrypt: (v: string) => v,
}));

const notified: string[] = [];
vi.mock("@/lib/notification-outbox", () => ({
  enqueueNotification: async (args: { kind: string }) => {
    notified.push(args.kind);
  },
}));

vi.mock("@/lib/webhooks", () => ({ triggerWebhooks: async () => {} }));

const P = "vitest-mpwh";
const IDS = {
  company: `${P}-company`,
  user: `${P}-user`,
  agenda: `${P}-agenda`,
  config: `${P}-config`,
  booking: `${P}-booking`,
  estimate: `${P}-estimate`,
};
const PAYMENT_ID = `${P}-payment`;

let db: typeof import("@/lib/db").db;
let POST: typeof import("@/app/api/mercadopago/webhook/route").POST;

async function cleanup() {
  await db.booking.deleteMany({ where: { companyId: IDS.company } });
  await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingConfig.deleteMany({ where: { companyId: IDS.company } });
  await db.agenda.deleteMany({ where: { companyId: IDS.company } });
  await db.companyPaymentSettings.deleteMany({ where: { companyId: IDS.company } });
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
      name: "Salão pix",
      slug: `${P}-slug`,
      businessType: "BARBER",
      planId: plan.id,
      isActive: true,
    },
  });
  await db.companyUser.create({
    data: { companyId: IDS.company, userId: IDS.user, role: "OWNER", isActive: true },
  });
  await db.companyPaymentSettings.create({
    data: { companyId: IDS.company, enablePix: true, mercadoPagoAccessToken: "token-fake" },
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

/** Agendamento PIX aguardando pagamento, com o valor devido gravado. */
async function makePendingPixBooking(onlineChargeAmount: string | null) {
  const t = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  const date = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  const time = `${p(t.getHours())}:${p(t.getMinutes())}`;

  await db.estimate.create({
    data: {
      id: IDS.estimate,
      companyId: IDS.company,
      bookingConfigId: IDS.config,
      customerName: "Cliente",
      customerEmail: `${P}@vitest.local`,
      subtotal: "200.00",
      total: "200.00",
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
      scheduledDate: date,
      scheduledStartTime: time,
      scheduledEndTime: time,
      status: "PENDING",
      paymentMethod: "PIX",
      paymentStatus: "PENDING",
      mercadoPagoPaymentId: PAYMENT_ID,
      onlineChargeAmount,
    },
  });
}

/** Entrega do MP para o pagamento acima. */
async function deliver() {
  const req = new Request(`https://exemplo.test/api/mercadopago/webhook?data.id=${PAYMENT_ID}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "payment", data: { id: PAYMENT_ID } }),
  });
  // O route handler recebe NextRequest; a classe aceita um Request como base.
  const { NextRequest } = await import("next/server");
  return POST(new NextRequest(req));
}

d("webhook do Mercado Pago (integração)", () => {
  beforeAll(async () => {
    // Sem segredo configurado e fora de produção, a assinatura não é exigida —
    // o que este arquivo testa é a conferência de VALOR, não a de assinatura.
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    ({ db } = await import("@/lib/db"));
    ({ POST } = await import("@/app/api/mercadopago/webhook/route"));
    await cleanup();
    await seedBase();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  beforeEach(() => {
    notified.length = 0;
    mpPayment.status = "approved";
    mpPayment.transaction_amount = 200;
  });

  afterEach(async () => {
    // Limpeza no afterEach: no fim do `it` ela não roda quando o caso falha, e
    // o resíduo contamina a execução seguinte da suíte inteira.
    await db.booking.deleteMany({ where: { companyId: IDS.company } });
    await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  });

  it("NÃO confirma agendamento pago por valor menor que o devido", async () => {
    await makePendingPixBooking("200.00");
    mpPayment.transaction_amount = 1; // aprovado, mas de 200 devidos

    await deliver();

    const after = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
    expect(after.paymentStatus).toBe("PENDING");
    expect(after.status).toBe("PENDING");
    expect(notified).toEqual([]);
  });

  it("confirma quando o valor pago cobre o devido", async () => {
    await makePendingPixBooking("200.00");
    mpPayment.transaction_amount = 200;

    await deliver();

    const after = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
    expect(after.paymentStatus).toBe("PAID");
    expect(after.status).toBe("CONFIRMED");
    expect(notified).toContain("BOOKING_CONFIRMED");
  });

  it("confirma agendamento antigo, sem valor devido gravado", async () => {
    // Criados antes da coluna existir. Recusar puniria o cliente por uma
    // lacuna nossa — o webhook confirma e registra o aviso.
    await makePendingPixBooking(null);
    mpPayment.transaction_amount = 1;

    await deliver();

    const after = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
    expect(after.paymentStatus).toBe("PAID");
  });
});
