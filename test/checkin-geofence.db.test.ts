import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cerca de check-in, contra o Postgres real.
 *
 * ─── O estado em que isto foi encontrado ─────────────────────────────────────
 *
 * O módulo `checkin_geofencing` era vendido e a cerca nunca rodou em empresa
 * nenhuma, por três motivos somados:
 *
 *  1. `Company.latitude` e `longitude` estavam no schema e eram LIDOS pela
 *     verificação, mas nenhuma tela jamais os gravava — sem coordenadas, o
 *     código pulava a cerca em silêncio;
 *  2. a tela de check-in do cliente vinha com "simular proximidade" LIGADO por
 *     padrão, enviando coordenadas fabricadas a 30 m da empresa, com um botão
 *     ao lado explicando o atalho;
 *  3. negar a permissão de GPS chamava a mesma action sem coordenadas, e a
 *     verificação era pulada de novo.
 *
 * Aqui se testa o que sobrou de pé: a configuração exige o módulo, e a cerca,
 * uma vez configurada, não é dispensável pelo verificado.
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

/** Geocodificador simulado: a rede não entra em teste. */
const geo = { coords: null as { latitude: number; longitude: number } | null };
vi.mock("@/lib/geo/geocode", () => ({
  geocodeAddress: async () => geo.coords,
  normalizeQuery: (p: { address: string }) => p.address,
}));

const P = "vitest-geofence";
const IDS = {
  company: `${P}-company`,
  user: `${P}-user`,
  agenda: `${P}-agenda`,
  config: `${P}-config`,
  booking: `${P}-booking`,
};
const SLUG = `${P}-slug`;
const MODULE = "checkin_geofencing";

/** Curitiba, centro — o ponto do estabelecimento. */
const SALAO = { latitude: -25.4284, longitude: -49.2733 };

let db: typeof import("@/lib/db").db;

async function cleanup() {
  await db.bookingSlot.deleteMany({ where: { agendaId: IDS.agenda } });
  await db.bookingCustomerDetail.deleteMany({ where: { bookingId: IDS.booking } });
  await db.booking.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingConfig.deleteMany({ where: { companyId: IDS.company } });
  await db.agenda.deleteMany({ where: { companyId: IDS.company } });
  await db.companyModuleLicense.deleteMany({ where: { companyId: IDS.company } });
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
      name: "Salão geofence",
      slug: SLUG,
      businessType: "BARBER",
      planId: plan.id,
      isActive: true,
      address: "Rua XV de Novembro, 100, Curitiba",
      checkinRadiusMeters: 250,
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
      startTime: "00:00",
      endTime: "23:00",
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

async function license(status = "ACTIVE") {
  await db.companyModuleLicense.upsert({
    where: { companyId_moduleCode: { companyId: IDS.company, moduleCode: MODULE } },
    update: { status },
    create: { companyId: IDS.company, moduleCode: MODULE, status },
  });
}

/**
 * Agendamento daqui a 5 minutos, para cair dentro da janela de check-in
 * (que abre 15 minutos antes).
 *
 * Data e hora saem do MESMO relógio local. A primeira versão misturava a data
 * em UTC com a hora local, e o teste reprovava com TOO_EARLY sem que a cerca
 * chegasse a ser avaliada.
 */
async function makeBooking() {
  const target = new Date(Date.now() + 5 * 60 * 1000);
  const date = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
  const hh = String(target.getHours()).padStart(2, "0");
  const mm = String(target.getMinutes()).padStart(2, "0");
  await db.booking.create({
    data: {
      id: IDS.booking,
      companyId: IDS.company,
      bookingConfigId: IDS.config,
      agendaId: IDS.agenda,
      scheduledDate: date,
      scheduledStartTime: `${hh}:${mm}`,
      scheduledEndTime: `${hh}:${mm}`,
      status: "CONFIRMED",
      paymentMethod: "CASH_CHECK",
    },
  });
}

d("cerca de check-in (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    await cleanup();
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  beforeEach(async () => {
    currentUser = { id: IDS.user, email: `${IDS.user}@vitest.local`, name: "Dono" };
    geo.coords = null;
    await license();
    await db.company.update({
      where: { id: IDS.company },
      data: { latitude: null, longitude: null, checkinRadiusMeters: 250 },
    });
  });

  afterEach(async () => {
    await db.bookingCustomerDetail.deleteMany({ where: { bookingId: IDS.booking } });
    await db.booking.deleteMany({ where: { companyId: IDS.company } });
  });

  describe("configuração", () => {
    it("sem o módulo contratado, não grava a cerca", async () => {
      const m = await import("@/server/actions/checkin-settings");
      await db.companyModuleLicense.deleteMany({ where: { companyId: IDS.company } });

      const res = await m.saveCheckinGeofenceAction(SLUG, { ...SALAO, radiusMeters: 250 });
      expect(res.success).toBe(false);

      const company = await db.company.findUnique({ where: { id: IDS.company } });
      expect(company?.latitude).toBeNull();
    });

    it("grava coordenadas e raio", async () => {
      const m = await import("@/server/actions/checkin-settings");
      expect(
        (await m.saveCheckinGeofenceAction(SLUG, { ...SALAO, radiusMeters: 300 })).success
      ).toBe(true);

      const company = await db.company.findUnique({ where: { id: IDS.company } });
      expect(company?.latitude).toBeCloseTo(SALAO.latitude, 4);
      expect(company?.checkinRadiusMeters).toBe(300);
    });

    it("meia coordenada é recusada", async () => {
      // Latitude sem longitude não localiza nada, e gravar assim deixaria a
      // tela dizendo "ativa" com uma cerca que nunca compara.
      const m = await import("@/server/actions/checkin-settings");
      const res = await m.saveCheckinGeofenceAction(SLUG, {
        latitude: SALAO.latitude,
        longitude: null,
        radiusMeters: 250,
      });
      expect(res.success).toBe(false);
    });

    it("raio pequeno demais é recusado", async () => {
      // Abaixo de 50 m o próprio erro do GPS reprova quem está na porta — e o
      // cliente reprovado liga para a recepção, que é o trabalho que o recurso
      // deveria eliminar.
      const m = await import("@/server/actions/checkin-settings");
      expect(
        (await m.saveCheckinGeofenceAction(SLUG, { ...SALAO, radiusMeters: 10 })).success
      ).toBe(false);
    });

    it("desligar limpa as coordenadas", async () => {
      const m = await import("@/server/actions/checkin-settings");
      await m.saveCheckinGeofenceAction(SLUG, { ...SALAO, radiusMeters: 250 });

      expect(
        (await m.saveCheckinGeofenceAction(SLUG, {
          latitude: null,
          longitude: null,
          radiusMeters: 250,
        })).success
      ).toBe(true);
      const company = await db.company.findUnique({ where: { id: IDS.company } });
      expect(company?.latitude).toBeNull();
    });

    it("localizar pelo endereço devolve o ponto sem gravá-lo", async () => {
      /**
       * Devolver em vez de gravar é deliberado: uma geocodificação errada — o
       * centroide da cidade vizinha — viraria uma cerca que reprova todo mundo
       * sem ninguém entender por quê. Quem clicou confere no mapa e salva.
       */
      const m = await import("@/server/actions/checkin-settings");
      geo.coords = SALAO;

      const res = await m.locateCompanyByAddressAction(SLUG);
      expect(res.success).toBe(true);
      if (res.success) expect(res.latitude).toBeCloseTo(SALAO.latitude, 4);

      const company = await db.company.findUnique({ where: { id: IDS.company } });
      expect(company?.latitude).toBeNull();
    });

    it("endereço que o geocodificador não reconhece não vira erro genérico", async () => {
      const m = await import("@/server/actions/checkin-settings");
      geo.coords = null;
      const res = await m.locateCompanyByAddressAction(SLUG);
      expect(res.success).toBe(false);
    });
  });

  describe("o check-in em si", () => {
    /**
     * O link de check-in é assinado (HMAC): a action é pública e o token é o
     * que impede alguém de confirmar a chegada de um agendamento alheio só com
     * o id. O teste precisa assinar como o e-mail assina.
     */
    async function checkin(coords?: { latitude: number; longitude: number }) {
      const { generateSignedCheckinToken } = await import("@/lib/security/signed-token");
      const m = await import("@/server/actions/checkin");
      const exp = Date.now() + 60 * 60 * 1000;
      const token = generateSignedCheckinToken(IDS.booking, IDS.company, exp);
      return m.performSmartCheckinAction(IDS.booking, coords, token, exp);
    }

    it("sem cerca configurada, passa de qualquer lugar", async () => {
      // É o estado de toda empresa até alguém abrir a tela. Reprovar por falta
      // de cadastro puniria o cliente por algo que ele não controla.
      await makeBooking();

      const res = await checkin(undefined);
      expect(res.success).toBe(true);
    });

    it("com cerca configurada, NÃO informar a posição é recusa", async () => {
      /**
       * O buraco principal. Antes, `clientCoords` vazio pulava a verificação
       * inteira — e a tela do cliente chamava esta action sem coordenadas assim
       * que o GPS falhava. Negar a permissão era o jeito mais fácil de burlar.
       */
      await db.company.update({ where: { id: IDS.company }, data: SALAO });
      await makeBooking();

      const res = await checkin(undefined);
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe("LOCATION_REQUIRED");

      const booking = await db.booking.findUnique({ where: { id: IDS.booking } });
      expect(booking?.checkedInAt).toBeNull();
    });

    it("cliente longe é recusado", async () => {
      await db.company.update({ where: { id: IDS.company }, data: SALAO });
      await makeBooking();

      // ~2 km ao norte, raio de 250 m.
      const res = await checkin({
        latitude: SALAO.latitude + 0.018,
        longitude: SALAO.longitude,
      });
      expect(res.success).toBe(false);
      if (!res.success) expect(res.code).toBe("OUT_OF_RANGE");
    });

    it("cliente na porta entra e a chegada fica registrada", async () => {
      await db.company.update({ where: { id: IDS.company }, data: SALAO });
      await makeBooking();

      const res = await checkin({
        latitude: SALAO.latitude + 0.0002,
        longitude: SALAO.longitude,
      });
      expect(res.success).toBe(true);

      const booking = await db.booking.findUnique({ where: { id: IDS.booking } });
      expect(booking?.checkedInAt).toBeInstanceOf(Date);
    });
  });
});
