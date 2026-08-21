import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * O cron de lembretes não pode reenfileirar o mesmo agendamento.
 *
 * ─── O defeito ───────────────────────────────────────────────────────────────
 *
 * A rota buscava "agendamentos de amanhã" e "daqui a 2h" e enfileirava, sem
 * conferir se já tinha enfileirado antes. Não havia marca nenhuma no
 * agendamento, nem chave única na fila.
 *
 * A janela de 2h tem 15 minutos de largura — número que só faz sentido se o
 * cron roda a cada 15 minutos. Nessa cadência, um agendamento marcado para
 * amanhã acumulava 96 lembretes até o dia chegar: 96 e-mails, 96 WhatsApps,
 * 96 SMS para o mesmo cliente, sobre o mesmo horário.
 *
 * Não aparecia em teste nenhum porque todos os testes chamam a rota uma vez.
 * O defeito só existe na SEGUNDA chamada.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

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

vi.mock("@/lib/vault-purge", () => ({ purgeExpiredClientPhotos: async () => ({ deleted: 0, failed: 0 }) }));

const P = "vitest-remind";
const IDS = {
  company: `${P}-company`,
  user: `${P}-user`,
  agenda: `${P}-agenda`,
  config: `${P}-config`,
  estimate: `${P}-estimate`,
  booking: `${P}-booking`,
};
const TZ = "America/Sao_Paulo";

let db: typeof import("@/lib/db").db;
let GET: typeof import("@/app/api/cron/reminders/route").GET;

async function cleanup() {
  await db.notificationOutbox.deleteMany({ where: { bookingId: IDS.booking } });
  await db.bookingCustomerDetail.deleteMany({ where: { bookingId: IDS.booking } });
  await db.booking.deleteMany({ where: { companyId: IDS.company } });
  await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingConfig.deleteMany({ where: { companyId: IDS.company } });
  await db.agenda.deleteMany({ where: { companyId: IDS.company } });
  await db.companyUser.deleteMany({ where: { companyId: IDS.company } });
  await db.company.deleteMany({ where: { id: IDS.company } });
  await db.user.deleteMany({ where: { id: IDS.user } });
}

/** "Amanhã" no fuso da empresa — a mesma conta que a rota faz. */
function amanhaNoFuso(): string {
  const agora = new Date();
  const local = new Date(agora.toLocaleString("en-US", { timeZone: TZ }));
  local.setDate(local.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${local.getFullYear()}-${p(local.getMonth() + 1)}-${p(local.getDate())}`;
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
      name: "Salão lembrete",
      slug: `${P}-slug`,
      businessType: "BARBER",
      planId: plan.id,
      isActive: true,
      timezone: TZ,
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

async function agendamentoParaAmanha() {
  await db.estimate.create({
    data: {
      id: IDS.estimate,
      companyId: IDS.company,
      bookingConfigId: IDS.config,
      customerName: "Cliente",
      customerEmail: `${P}@vitest.local`,
      subtotal: "50.00",
      total: "50.00",
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
      scheduledDate: amanhaNoFuso(),
      scheduledStartTime: "10:00",
      scheduledEndTime: "11:00",
      status: "CONFIRMED",
      paymentMethod: "CASH_CHECK",
      paymentStatus: "PENDING",
    },
  });
  await db.bookingCustomerDetail.create({
    data: {
      bookingId: IDS.booking,
      firstName: "Cliente",
      lastName: "Teste",
      email: `${P}@vitest.local`,
      phone: "11999990000",
      sendReminders: true,
      address: "Rua Um, 1",
      city: "São Paulo",
      zip: "01000-000",
    },
  });
}

/** Uma passada do cron, autenticada. */
async function rodaCron() {
  const { NextRequest } = await import("next/server");
  const req = new NextRequest(
    new Request("https://exemplo.test/api/cron/reminders", {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
  );
  return GET(req);
}

async function lembretesNaFila() {
  return db.notificationOutbox.count({
    where: { bookingId: IDS.booking, kind: "BOOKING_REMINDER" },
  });
}

d("lembretes não se repetem (integração)", () => {
  beforeAll(async () => {
    process.env.CRON_SECRET = "segredo-de-teste";
    ({ db } = await import("@/lib/db"));
    ({ GET } = await import("@/app/api/cron/reminders/route"));
    await cleanup();
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  afterEach(async () => {
    await db.notificationOutbox.deleteMany({ where: { bookingId: IDS.booking } });
    await db.bookingCustomerDetail.deleteMany({ where: { bookingId: IDS.booking } });
    await db.booking.deleteMany({ where: { companyId: IDS.company } });
    await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  });

  it("três passadas do cron enfileiram UM lembrete", async () => {
    await agendamentoParaAmanha();

    await rodaCron();
    await rodaCron();
    await rodaCron();

    expect(await lembretesNaFila()).toBe(1);
  });

  it("a primeira passada realmente enfileira", async () => {
    // Controle positivo: sem ele, o teste acima passaria se o cron nunca
    // enfileirasse nada — que é o modo mais fácil de "não duplicar".
    await agendamentoParaAmanha();

    await rodaCron();

    expect(await lembretesNaFila()).toBe(1);
    const depois = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
    expect(depois.reminder24hQueuedAt).not.toBeNull();
  });

  it("quem pediu para não receber lembrete continua sem receber", async () => {
    await agendamentoParaAmanha();
    await db.bookingCustomerDetail.update({
      where: { bookingId: IDS.booking },
      data: { sendReminders: false },
    });

    await rodaCron();

    expect(await lembretesNaFila()).toBe(0);
  });
});
