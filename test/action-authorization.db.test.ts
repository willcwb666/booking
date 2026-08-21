import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Tem sessão" não é "tem permissão".
 *
 * ─── O padrão que este arquivo fecha ─────────────────────────────────────────
 *
 * `scripts/audit-server-actions.py` pergunta se a action AUTENTICA.
 * `scripts/audit-action-authorization.py` — escrito para esta varredura —
 * pergunta a seguinte, que é outra: se ela AUTORIZA.
 *
 * Cinco actions confirmavam que havia sessão e iam direto ao banco pelo slug
 * da empresa. O slug é público: está na URL de agendamento de todo salão. Com
 * uma conta qualquer da plataforma dava para:
 *
 *   - reescrever por qual gateway QUALQUER empresa recebe dinheiro;
 *   - reescrever título, cor, capa e redes da página pública de qualquer uma;
 *   - marcar falta ou CANCELAR agendamento de qualquer uma;
 *   - cancelar a assinatura do Stripe de qualquer uma (esta era para ser só de
 *     super admin — a action irmã, no mesmo arquivo, sempre conferiu).
 *
 * Cada caso aqui tem o par positivo: o dono legítimo continua conseguindo. Sem
 * ele, o teste passaria mesmo com a action quebrada por outro motivo.
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
 * Prefixo proprio, distinto do de `authorization.db.test.ts`.
 *
 * Os dois arquivos nasceram com "vitest-authz". Os ids nao colidiam por pouco
 * ("-company" contra "-company-a"), mas um `deleteMany` por prefixo em
 * qualquer um dos dois passaria a apagar dado do outro — e o sintoma seria uma
 * falha intermitente num arquivo que ninguem tocou.
 */
const P = "vitest-actauthz";
const IDS = {
  company: `${P}-company`,
  owner: `${P}-owner`,
  outsider: `${P}-outsider`,
  agenda: `${P}-agenda`,
  config: `${P}-config`,
  estimate: `${P}-estimate`,
  booking: `${P}-booking`,
};
const SLUG = `${P}-slug`;

let db: typeof import("@/lib/db").db;
let updateLanding: typeof import("@/server/actions/company-landing").updateCompanyLandingSettingsAction;
let markNoShow: typeof import("@/server/actions/booking").markBookingNoShowAction;

const OWNER: FakeUser = { id: IDS.owner, email: `${IDS.owner}@vitest.local`, name: "Dono" };
const OUTSIDER: FakeUser = {
  id: IDS.outsider,
  email: `${IDS.outsider}@vitest.local`,
  name: "Estranho",
};

async function cleanup() {
  await db.booking.deleteMany({ where: { companyId: IDS.company } });
  await db.estimate.deleteMany({ where: { companyId: IDS.company } });
  await db.bookingConfig.deleteMany({ where: { companyId: IDS.company } });
  await db.agenda.deleteMany({ where: { companyId: IDS.company } });
  await db.companyUser.deleteMany({ where: { companyId: IDS.company } });
  await db.company.deleteMany({ where: { id: IDS.company } });
  await db.user.deleteMany({ where: { id: { in: [IDS.owner, IDS.outsider] } } });
}

async function seed() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  await db.user.createMany({
    data: [
      { id: IDS.owner, name: "Dono", email: OWNER.email, emailVerified: true },
      { id: IDS.outsider, name: "Estranho", email: OUTSIDER.email, emailVerified: true },
    ],
  });
  await db.company.create({
    data: {
      id: IDS.company,
      name: "Salão authz",
      slug: SLUG,
      businessType: "BARBER",
      planId: plan.id,
      isActive: true,
      heroTitle: "TITULO ORIGINAL",
    },
  });
  await db.companyUser.create({
    data: { companyId: IDS.company, userId: IDS.owner, role: "OWNER", isActive: true },
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

async function makeBooking() {
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
      scheduledDate: date,
      scheduledStartTime: time,
      scheduledEndTime: time,
      status: "CONFIRMED",
      paymentMethod: "CASH_CHECK",
      paymentStatus: "PENDING",
    },
  });
}

const LANDING = {
  heroTitle: "PICHADO",
  heroSubtitle: "",
  brandColor: "#000000",
  coverImageUrl: "",
  socialInstagram: "",
  socialWhatsapp: "",
  socialFacebook: "",
};

d("autorização das server actions por empresa (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ updateCompanyLandingSettingsAction: updateLanding } = await import(
      "@/server/actions/company-landing"
    ));
    ({ markBookingNoShowAction: markNoShow } = await import("@/server/actions/booking"));
    await cleanup();
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  beforeEach(() => {
    currentUser = OWNER;
  });

  afterEach(async () => {
    // Limpeza no afterEach: no fim do `it` ela não roda quando o caso falha, e
    // o resíduo contamina a execução seguinte da suíte inteira.
    await db.booking.deleteMany({ where: { companyId: IDS.company } });
    await db.estimate.deleteMany({ where: { companyId: IDS.company } });
    await db.company.update({
      where: { id: IDS.company },
      data: { heroTitle: "TITULO ORIGINAL" },
    });
  });

  describe("página pública da empresa", () => {
    it("estranho NÃO reescreve a vitrine de outra empresa", async () => {
      currentUser = OUTSIDER;
      const res = await updateLanding(SLUG, LANDING);
      expect(res.success).toBe(false);

      const depois = await db.company.findUniqueOrThrow({ where: { id: IDS.company } });
      expect(depois.heroTitle).toBe("TITULO ORIGINAL");
    });

    it("visitante sem sessão também não", async () => {
      currentUser = null;
      expect((await updateLanding(SLUG, LANDING)).success).toBe(false);
    });

    it("o dono reescreve normalmente", async () => {
      const res = await updateLanding(SLUG, LANDING);
      expect(res.success).toBe(true);

      const depois = await db.company.findUniqueOrThrow({ where: { id: IDS.company } });
      expect(depois.heroTitle).toBe("PICHADO");
    });
  });

  describe("marcar falta / cancelar agendamento", () => {
    it("estranho NÃO cancela agendamento de outra empresa", async () => {
      await makeBooking();
      currentUser = OUTSIDER;

      const res = await markNoShow({
        bookingId: IDS.booking,
        companySlug: SLUG,
        didNotify: true, // este ramo CANCELA
      });
      expect(res.success).toBe(false);

      const depois = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
      expect(depois.status).toBe("CONFIRMED");
    });

    it("o dono marca falta normalmente", async () => {
      await makeBooking();

      const res = await markNoShow({
        bookingId: IDS.booking,
        companySlug: SLUG,
        didNotify: false,
      });
      expect(res.success).toBe(true);

      const depois = await db.booking.findUniqueOrThrow({ where: { id: IDS.booking } });
      expect(depois.status).toBe("NO_SHOW");
    });
  });

  describe("papel mínimo", () => {
    it("EMPLOYEE não mexe na vitrine — é decisão de gerência", async () => {
      // `canAccessCompany` sem `minRole` deixaria passar: qualquer membro
      // ativo serve. A vitrine e o gateway de pagamento pedem MANAGER.
      await db.companyUser.update({
        where: { companyId_userId: { companyId: IDS.company, userId: IDS.owner } },
        data: { role: "EMPLOYEE" },
      });

      const res = await updateLanding(SLUG, LANDING);
      expect(res.success).toBe(false);

      await db.companyUser.update({
        where: { companyId_userId: { companyId: IDS.company, userId: IDS.owner } },
        data: { role: "OWNER" },
      });
    });
  });
});
