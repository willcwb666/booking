import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Bloqueio de deslocamento contra o Postgres real.
 *
 * A matemática está coberta, pura, em `src/lib/geo/drive-time.test.ts`. O que
 * se testa aqui é o que aquela suíte não alcança:
 *
 *  1. o bloqueio realmente TIRA o horário da grade. Um bloco gravado que
 *     `getAvailableSlots` ignora seria decoração — apareceria na tela do dono
 *     e continuaria vendendo o horário impossível;
 *  2. recalcular duas vezes não duplica nem multiplica bloqueios;
 *  3. desligar o recurso limpa o que ele deixou, em vez de abandonar bloqueios
 *     órfãos que ninguém sabe explicar depois.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

const P = "vitest-drivetime";
const IDS = {
  company: `${P}-company`,
  user: `${P}-user`,
  prof: `${P}-prof`,
  agenda: `${P}-agenda`,
  config: `${P}-config`,
  manha: `${P}-booking-manha`,
  tarde: `${P}-booking-tarde`,
};

/** Uma segunda-feira bem no futuro — fora do filtro de "horário já passou". */
const DATE = "2027-03-15";

/** Curitiba, centro. */
const CENTRO = { latitude: -25.4284, longitude: -49.2733 };
/** ~6 km ao norte: 0.054° de latitude. 6 km × 3 min/km = 18 min de reserva. */
const NORTE = { latitude: -25.3744, longitude: -49.2733 };

let db: typeof import("@/lib/db").db;
let refreshTravelBlocks: typeof import("@/lib/geo/travel-blocks").refreshTravelBlocks;
let getAvailableSlots: typeof import("@/lib/agenda").getAvailableSlots;

async function cleanup() {
  await db.scheduleEvent.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingCustomerDetail.deleteMany({
    where: { bookingId: { in: [IDS.manha, IDS.tarde] } },
  });
  await db.bookingSlot.deleteMany({ where: { agendaId: IDS.agenda } });
  await db.booking.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingConfig.deleteMany({ where: { companyId: IDS.company } });
  await db.agendaProfessional.deleteMany({ where: { agendaId: IDS.agenda } });
  await db.agenda.deleteMany({ where: { companyId: IDS.company } });
  await db.professional.deleteMany({ where: { companyId: IDS.company } });
  await db.companyUser.deleteMany({ where: { companyId: IDS.company } });
  await db.company.deleteMany({ where: { id: IDS.company } });
  await db.user.deleteMany({ where: { id: IDS.user } });
}

async function seedBase() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  await db.user.create({
    data: {
      id: IDS.user,
      name: "Dono deslocamento",
      email: `${IDS.user}@vitest.local`,
      emailVerified: true,
    },
  });

  await db.company.create({
    data: {
      id: IDS.company,
      name: "Oficina móvel",
      slug: `${P}-slug`,
      businessType: "MECHANIC",
      planId: plan.id,
      isActive: true,
      driveTimeEnabled: true,
      driveTimeMinutesPerKm: 3,
      driveTimeMaxMinutes: 120,
    },
  });

  await db.companyUser.create({
    data: { companyId: IDS.company, userId: IDS.user, role: "OWNER", isActive: true },
  });

  await db.professional.create({
    data: { id: IDS.prof, companyId: IDS.company, name: "Mecânico", isActive: true },
  });

  await db.agenda.create({
    data: {
      id: IDS.agenda,
      companyId: IDS.company,
      name: "Rota",
      status: "ACTIVE",
      startDate: "2026-01-01",
      // 1 = segunda-feira, que é o dia da semana de DATE.
      workingDays: [1],
      startTime: "08:00",
      endTime: "18:00",
      intervalMinutes: 60,
      createdById: IDS.user,
    },
  });

  await db.agendaProfessional.create({
    data: { agendaId: IDS.agenda, professionalId: IDS.prof },
  });

  await db.bookingConfig.create({
    data: {
      id: IDS.config,
      companyId: IDS.company,
      agendaId: IDS.agenda,
      name: "Revisão em domicílio",
      status: "PUBLISHED",
      createdById: IDS.user,
    },
  });
}

async function createBooking(
  id: string,
  startTime: string,
  endTime: string,
  coords: { latitude: number; longitude: number } | null
) {
  await db.booking.create({
    data: {
      id,
      companyId: IDS.company,
      bookingConfigId: IDS.config,
      agendaId: IDS.agenda,
      professionalId: IDS.prof,
      scheduledDate: DATE,
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      status: "CONFIRMED",
      paymentMethod: "CASH_CHECK",
    },
  });
  await db.bookingCustomerDetail.create({
    data: {
      bookingId: id,
      firstName: "Cliente",
      lastName: id.slice(-5),
      email: `${id}@vitest.local`,
      phone: "41999999999",
      address: "Rua de teste, 100",
      city: "Curitiba",
      zip: "80000-000",
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    },
  });
}

d("bloqueio de deslocamento (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ refreshTravelBlocks } = await import("@/lib/geo/travel-blocks"));
    ({ getAvailableSlots } = await import("@/lib/agenda"));
    await cleanup();
    await seedBase();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  beforeEach(async () => {
    await db.scheduleEvent.deleteMany({ where: { companyId: IDS.company } });
    await db.bookingCustomerDetail.deleteMany({
      where: { bookingId: { in: [IDS.manha, IDS.tarde] } },
    });
    await db.booking.deleteMany({ where: { companyId: IDS.company } });
    await db.company.update({
      where: { id: IDS.company },
      data: { driveTimeEnabled: true, driveTimeMinutesPerKm: 3, driveTimeMaxMinutes: 120 },
    });
  });

  it("grava os bloqueios entre dois atendimentos distantes", async () => {
    await createBooking(IDS.manha, "09:00", "10:00", CENTRO);
    await createBooking(IDS.tarde, "14:00", "15:00", NORTE);

    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);

    const events = await db.scheduleEvent.findMany({
      where: { companyId: IDS.company, source: "DRIVE_TIME" },
      orderBy: { startTime: "asc" },
    });

    // Janela de 10:00 a 14:00, viagem de ~18 min: reserva nas duas pontas.
    expect(events).toHaveLength(2);
    expect(events[0].startTime).toBe("10:00");
    expect(events[1].endTime).toBe("14:00");
    // Sem autor: ninguém criou este bloco.
    expect(events[0].createdById).toBeNull();
    // O título carrega a conta, para o dono poder discordar dela.
    expect(events[0].title).toContain("km");
  });

  it("o bloqueio tira o horário da grade — não é decoração", async () => {
    await createBooking(IDS.manha, "09:00", "10:00", CENTRO);
    await createBooking(IDS.tarde, "14:00", "15:00", NORTE);

    const antes = await getAvailableSlots(IDS.agenda, DATE, IDS.prof);
    expect(antes.map((s) => s.startTime)).toContain("10:00");
    expect(antes.map((s) => s.startTime)).toContain("13:00");

    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);

    const depois = await getAvailableSlots(IDS.agenda, DATE, IDS.prof);
    const horarios = depois.map((s) => s.startTime);
    // 10:00 encosta no fim do primeiro atendimento e 13:00 encosta no começo
    // do segundo: os dois exigiriam sair sem tempo de chegada.
    expect(horarios).not.toContain("10:00");
    expect(horarios).not.toContain("13:00");
    // O miolo continua vendável — a reserva não é um bloqueio do dia todo.
    expect(horarios).toContain("11:00");
    expect(horarios).toContain("12:00");
  });

  it("recalcular não duplica", async () => {
    await createBooking(IDS.manha, "09:00", "10:00", CENTRO);
    await createBooking(IDS.tarde, "14:00", "15:00", NORTE);

    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);
    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);
    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);

    const count = await db.scheduleEvent.count({
      where: { companyId: IDS.company, source: "DRIVE_TIME" },
    });
    expect(count).toBe(2);
  });

  it("desligar o recurso limpa os bloqueios que ele deixou", async () => {
    await createBooking(IDS.manha, "09:00", "10:00", CENTRO);
    await createBooking(IDS.tarde, "14:00", "15:00", NORTE);
    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);
    expect(
      await db.scheduleEvent.count({ where: { companyId: IDS.company, source: "DRIVE_TIME" } })
    ).toBe(2);

    await db.company.update({
      where: { id: IDS.company },
      data: { driveTimeEnabled: false },
    });
    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);

    expect(
      await db.scheduleEvent.count({ where: { companyId: IDS.company, source: "DRIVE_TIME" } })
    ).toBe(0);
  });

  it("endereço sem coordenada não gera bloqueio", async () => {
    await createBooking(IDS.manha, "09:00", "10:00", CENTRO);
    await createBooking(IDS.tarde, "14:00", "15:00", null);

    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);

    expect(
      await db.scheduleEvent.count({ where: { companyId: IDS.company, source: "DRIVE_TIME" } })
    ).toBe(0);
  });

  it("atendimento cancelado sai da rota", async () => {
    await createBooking(IDS.manha, "09:00", "10:00", CENTRO);
    await createBooking(IDS.tarde, "14:00", "15:00", NORTE);
    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);
    expect(
      await db.scheduleEvent.count({ where: { companyId: IDS.company, source: "DRIVE_TIME" } })
    ).toBe(2);

    await db.booking.update({ where: { id: IDS.tarde }, data: { status: "CANCELLED" } });
    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);

    expect(
      await db.scheduleEvent.count({ where: { companyId: IDS.company, source: "DRIVE_TIME" } })
    ).toBe(0);
  });

  it("não toca em bloqueios manuais", async () => {
    // O recálculo apaga e refaz. Se o filtro por `source` falhasse, levaria
    // junto o bloqueio de almoço que o dono cadastrou à mão.
    await db.scheduleEvent.create({
      data: {
        companyId: IDS.company,
        professionalId: IDS.prof,
        date: DATE,
        startTime: "12:00",
        endTime: "13:00",
        title: "Almoço",
        type: "EVENT",
        source: "MANUAL",
        createdById: IDS.user,
      },
    });

    await createBooking(IDS.manha, "09:00", "10:00", CENTRO);
    await createBooking(IDS.tarde, "14:00", "15:00", NORTE);
    await refreshTravelBlocks(IDS.company, IDS.prof, DATE);

    const manual = await db.scheduleEvent.findFirst({
      where: { companyId: IDS.company, source: "MANUAL" },
    });
    expect(manual).not.toBeNull();
    expect(manual?.title).toBe("Almoço");
  });

  it("bloqueio da empresa inteira fecha o horário para todo mundo", async () => {
    /**
     * Evento sem profissional é o feriado, a dedetização, a reunião de equipe.
     *
     * O filtro de slots exigia `professionalId` igual ao escolhido, então esses
     * eventos não batiam com ninguém: o dono cadastrava, via o bloco na agenda,
     * e a página pública seguia vendendo o dia. Zero linhas assim existiam no
     * banco quando isto foi encontrado — mas a tela de agenda deixa criar.
     */
    await db.scheduleEvent.create({
      data: {
        companyId: IDS.company,
        professionalId: null,
        date: DATE,
        startTime: "09:00",
        endTime: "12:00",
        title: "Feriado — empresa fechada",
        type: "EVENT",
        source: "MANUAL",
        createdById: IDS.user,
      },
    });

    // Com profissional escolhido.
    const doProf = await getAvailableSlots(IDS.agenda, DATE, IDS.prof);
    expect(doProf.map((s) => s.startTime)).not.toContain("09:00");
    expect(doProf.map((s) => s.startTime)).not.toContain("11:00");
    expect(doProf.map((s) => s.startTime)).toContain("12:00");

    // E em "qualquer profissional", onde o bloqueio não pode ser contado como
    // "mais um ocupado" — ele fecha sozinho, mesmo com a equipe toda livre.
    const qualquer = await getAvailableSlots(IDS.agenda, DATE, null);
    expect(qualquer.map((s) => s.startTime)).not.toContain("09:00");
    expect(qualquer.map((s) => s.startTime)).toContain("12:00");
  });

  it("sem profissional não grava bloqueio — ele não protegeria horário nenhum", async () => {
    await createBooking(IDS.manha, "09:00", "10:00", CENTRO);
    await createBooking(IDS.tarde, "14:00", "15:00", NORTE);

    await refreshTravelBlocks(IDS.company, null, DATE);

    expect(
      await db.scheduleEvent.count({ where: { companyId: IDS.company, source: "DRIVE_TIME" } })
    ).toBe(0);
  });
});
