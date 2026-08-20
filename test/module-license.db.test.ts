import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Trava dos módulos licenciados, contra o Postgres real.
 *
 * ─── Os dois defeitos que este arquivo fixa ──────────────────────────────────
 *
 * 1. Licença de módulo só escondia o item do MENU.
 *
 *    Descoberto abrindo as URLs num navegador: com ZERO licenças no banco,
 *    `/{empresa}/gift-cards`, `/fidelidade`, `/promocoes`, `/waitlist` e
 *    `/assinaturas` abriam e funcionavam por inteiro. E nenhuma das server
 *    actions por trás delas conferia licença — `grep canAccessModule` nos oito
 *    arquivos de action dava zero.
 *
 *    Esconder o link não é controle de acesso. Server action é endpoint HTTP:
 *    quem sabe o nome dela, chama, sem passar por menu nenhum.
 *
 * 2. `loyalty.ts` não checava associação à empresa.
 *
 *    `updateCompanyLoyaltyProgramAction` verificava apenas que havia sessão —
 *    qualquer usuário logado reescrevia as regras de fidelidade de QUALQUER
 *    empresa passando o slug. E a leitura, marcada no código como "endpoint
 *    público", devolvia os 20 clientes com mais pontos COM E-MAIL, sem sessão
 *    nenhuma. O slug é público: está na URL de agendamento de toda empresa.
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

const P = "vitest-modlic";
const IDS = {
  company: `${P}-company`,
  owner: `${P}-owner`,
  outsider: `${P}-outsider`,
};

let db: typeof import("@/lib/db").db;
let MODULE_CODES: typeof import("@/lib/module-codes").MODULE_CODES;
let createGiftCardAction: typeof import("@/server/actions/gift-cards").createGiftCardAction;
let updateLoyalty: typeof import("@/server/actions/loyalty").updateCompanyLoyaltyProgramAction;
let readLoyalty: typeof import("@/server/actions/loyalty").getCompanyLoyaltyProgramAction;

async function cleanup() {
  await db.giftCard.deleteMany({ where: { companyId: IDS.company } });
  await db.$executeRawUnsafe(`DELETE FROM "loyalty_program" WHERE "companyId" = $1`, IDS.company);
  await db.companyModuleLicense.deleteMany({ where: { companyId: IDS.company } });
  await db.companyUser.deleteMany({ where: { companyId: IDS.company } });
  await db.company.deleteMany({ where: { id: IDS.company } });
  await db.user.deleteMany({ where: { id: { in: [IDS.owner, IDS.outsider] } } });
}

async function seed() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  await db.user.createMany({
    data: [
      { id: IDS.owner, name: "Dono", email: `${IDS.owner}@vitest.local`, emailVerified: true },
      { id: IDS.outsider, name: "Estranho", email: `${IDS.outsider}@vitest.local`, emailVerified: true },
    ],
  });
  await db.company.create({
    data: {
      id: IDS.company,
      name: "Salão licenciado",
      slug: `${P}-slug`,
      businessType: "BARBER",
      planId: plan.id,
      isActive: true,
    },
  });
  await db.companyUser.create({
    data: { companyId: IDS.company, userId: IDS.owner, role: "OWNER", isActive: true },
  });
}

async function grant(moduleCode: string, expiresAt: Date | null = null) {
  await db.companyModuleLicense.create({
    data: { companyId: IDS.company, moduleCode, status: "ACTIVE", expiresAt },
  });
}

/** A action falha por `success: false` ou por throw — os dois contam. */
async function failed(call: () => Promise<unknown>): Promise<boolean> {
  try {
    const res = (await call()) as { success?: boolean } | undefined;
    if (res && typeof res === "object" && "success" in res) return res.success === false;
    return false;
  } catch {
    return true;
  }
}

d("trava de módulo licenciado (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ MODULE_CODES } = await import("@/lib/module-codes"));
    ({ createGiftCardAction } = await import("@/server/actions/gift-cards"));
    ({
      updateCompanyLoyaltyProgramAction: updateLoyalty,
      getCompanyLoyaltyProgramAction: readLoyalty,
    } = await import("@/server/actions/loyalty"));
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
    // Limpeza no afterEach: no fim do `it` ela não roda quando o caso falha, e
    // o resíduo contamina a execução seguinte da suíte inteira.
    await db.giftCard.deleteMany({ where: { companyId: IDS.company } });
    await db.$executeRawUnsafe(`DELETE FROM "loyalty_program" WHERE "companyId" = $1`, IDS.company);
    await db.companyModuleLicense.deleteMany({ where: { companyId: IDS.company } });
  });

  describe("vale-presente", () => {
    const novoVale = () =>
      createGiftCardAction(`${P}-slug`, {
        amount: 100,
        recipientName: "Cliente",
        recipientEmail: `${P}-dest@vitest.local`,
      });

    it("o dono NÃO emite vale sem o módulo contratado", async () => {
      // Era o vazamento: o dono não via o link no menu, mas a action respondia
      // a quem a chamasse.
      expect(await failed(novoVale)).toBe(true);
      expect(await db.giftCard.count({ where: { companyId: IDS.company } })).toBe(0);
    });

    it("emite normalmente com o módulo contratado", async () => {
      // Controle positivo: sem ele, o teste acima passaria mesmo que a action
      // estivesse quebrada por qualquer outro motivo.
      await grant(MODULE_CODES.giftCards);
      expect(await failed(novoVale)).toBe(false);
      expect(await db.giftCard.count({ where: { companyId: IDS.company } })).toBe(1);
    });

    it("licença vencida não vale como licença", async () => {
      await grant(MODULE_CODES.giftCards, new Date(Date.now() - 60_000));
      expect(await failed(novoVale)).toBe(true);
    });

    it("licença cancelada não vale como licença", async () => {
      await db.companyModuleLicense.create({
        data: { companyId: IDS.company, moduleCode: MODULE_CODES.giftCards, status: "CANCELLED" },
      });
      expect(await failed(novoVale)).toBe(true);
    });
  });

  describe("fidelidade", () => {
    const regras = {
      isEnabled: true,
      pointsPerCurrency: 1,
      rewardThreshold: 100,
      discountAmount: 10,
    };

    it("estranho à empresa NÃO reescreve as regras de fidelidade", async () => {
      // O defeito: a action só perguntava se havia sessão, nunca de quem.
      await grant(MODULE_CODES.loyalty);
      currentUser = { id: IDS.outsider, email: `${IDS.outsider}@vitest.local`, name: "Estranho" };

      expect(await failed(() => updateLoyalty(`${P}-slug`, regras))).toBe(true);

      const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "loyalty_program" WHERE "companyId" = $1`,
        IDS.company
      );
      expect(rows).toHaveLength(0);
    });

    it("o dono reescreve normalmente", async () => {
      await grant(MODULE_CODES.loyalty);
      expect(await failed(() => updateLoyalty(`${P}-slug`, regras))).toBe(false);
    });

    it("nem o dono reescreve sem o módulo contratado", async () => {
      expect(await failed(() => updateLoyalty(`${P}-slug`, regras))).toBe(true);
    });

    it("visitante sem sessão NÃO lê a lista de clientes", async () => {
      // A leitura estava marcada como "endpoint público" e devolvia os 20
      // clientes com mais pontos, com e-mail. O slug é público.
      await grant(MODULE_CODES.loyalty);
      currentUser = null;

      const res = (await readLoyalty(`${P}-slug`)) as {
        success: boolean;
        customers?: unknown[];
      };
      expect(res.success).toBe(false);
      expect(res.customers).toBeUndefined();
    });

    it("estranho à empresa NÃO lê a lista de clientes", async () => {
      await grant(MODULE_CODES.loyalty);
      currentUser = { id: IDS.outsider, email: `${IDS.outsider}@vitest.local`, name: "Estranho" };

      const res = (await readLoyalty(`${P}-slug`)) as {
        success: boolean;
        customers?: unknown[];
      };
      expect(res.success).toBe(false);
      expect(res.customers).toBeUndefined();
    });

    it("o dono lê normalmente", async () => {
      await grant(MODULE_CODES.loyalty);
      const res = (await readLoyalty(`${P}-slug`)) as { success: boolean };
      expect(res.success).toBe(true);
    });
  });
});
