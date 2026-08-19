import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Autorização das server actions, contra o Postgres de desenvolvimento.
 * Roda com `RUN_DB_TESTS=1`.
 *
 * O teste estático (`server-actions-guard.test.ts`) garante que toda action
 * *tem* verificação. Este garante que a verificação *funciona*: monta duas
 * empresas reais, com donos diferentes, e chama cada action de gestão três
 * vezes — sem sessão, com a sessão do dono errado, e com a do dono certo.
 *
 * A sessão é a única coisa simulada. O vínculo com a empresa é lido do banco
 * de verdade, que é justamente onde os oito furos desta sessão estavam.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

type FakeUser = { id: string; email: string; name: string; role?: string | null };

/** Sessão devolvida por `auth.api.getSession` na chamada seguinte. */
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

// Rate limit fora do caminho: aqui interessa autorização, não throttling.
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

const P = "vitest-authz";
const A = { company: `${P}-company-a`, user: `${P}-user-a`, slug: `${P}-alpha` };
const B = { company: `${P}-company-b`, user: `${P}-user-b`, slug: `${P}-beta` };

let db: typeof import("@/lib/db").db;

async function seed() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  for (const side of [A, B]) {
    await db.user.upsert({
      where: { id: side.user },
      update: {},
      create: {
        id: side.user,
        name: `Dono ${side.slug}`,
        email: `${side.user}@vitest.local`,
        emailVerified: true,
      },
    });

    await db.company.upsert({
      where: { id: side.company },
      update: {},
      create: {
        id: side.company,
        name: `Empresa ${side.slug}`,
        slug: side.slug,
        businessType: "OTHER",
        planId: plan.id,
        isActive: true,
      },
    });

    await db.companyUser.upsert({
      where: { companyId_userId: { companyId: side.company, userId: side.user } },
      update: { role: "OWNER", isActive: true },
      create: {
        companyId: side.company,
        userId: side.user,
        role: "OWNER",
        isActive: true,
      },
    });
  }
}

async function cleanup() {
  await db.companyUser.deleteMany({ where: { companyId: { in: [A.company, B.company] } } });
  await db.company.deleteMany({ where: { id: { in: [A.company, B.company] } } });
  await db.user.deleteMany({ where: { id: { in: [A.user, B.user] } } });
}

/** Toda action do projeto sinaliza falha por `success: false` ou por throw. */
async function denied(call: () => Promise<unknown>): Promise<boolean> {
  try {
    const res = (await call()) as { success?: boolean } | undefined;
    if (res && typeof res === "object" && "success" in res) return res.success === false;
    // Sem campo `success`: só conta como negado se lançou.
    return false;
  } catch {
    return true;
  }
}

d("autorização das server actions (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    await cleanup();
    await seed();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  describe("canAccessCompany", () => {
    it("nega sem sessão", async () => {
      const { canAccessCompany } = await import("@/lib/admin-guard");
      currentUser = null;
      expect((await canAccessCompany(A.slug)).ok).toBe(false);
    });

    it("nega o dono de outra empresa", async () => {
      const { canAccessCompany } = await import("@/lib/admin-guard");
      currentUser = { id: B.user, email: "b@vitest.local", name: "B" };
      expect((await canAccessCompany(A.slug)).ok).toBe(false);
    });

    it("permite o próprio dono", async () => {
      const { canAccessCompany } = await import("@/lib/admin-guard");
      currentUser = { id: A.user, email: "a@vitest.local", name: "A" };
      const res = await canAccessCompany(A.slug);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.companyId).toBe(A.company);
    });

    it("permite super admin em qualquer empresa", async () => {
      const { canAccessCompany } = await import("@/lib/admin-guard");
      currentUser = { id: B.user, email: "b@vitest.local", name: "B", role: "admin" };
      expect((await canAccessCompany(A.slug)).ok).toBe(true);
    });

    it("nega membro desativado", async () => {
      const { canAccessCompany } = await import("@/lib/admin-guard");
      await db.companyUser.update({
        where: { companyId_userId: { companyId: A.company, userId: A.user } },
        data: { isActive: false },
      });
      currentUser = { id: A.user, email: "a@vitest.local", name: "A" };
      expect((await canAccessCompany(A.slug)).ok).toBe(false);
      await db.companyUser.update({
        where: { companyId_userId: { companyId: A.company, userId: A.user } },
        data: { isActive: true },
      });
    });
  });

  describe("requireSuperAdmin", () => {
    it("nega sem sessão e nega usuário comum", async () => {
      const { requireSuperAdmin } = await import("@/lib/admin-guard");
      currentUser = null;
      expect((await requireSuperAdmin()).ok).toBe(false);
      currentUser = { id: A.user, email: "a@vitest.local", name: "A" };
      expect((await requireSuperAdmin()).ok).toBe(false);
    });

    it("permite super admin", async () => {
      const { requireSuperAdmin } = await import("@/lib/admin-guard");
      currentUser = { id: A.user, email: "a@vitest.local", name: "A", role: "admin" };
      expect((await requireSuperAdmin()).ok).toBe(true);
    });
  });

  describe("actions de gestão da empresa", () => {
    /**
     * Cada entrada chama a action com o slug da empresa A. Nenhuma delas pode
     * funcionar sem sessão nem com a sessão do dono de B — foi exatamente
     * assim que os furos desta sessão eram explorados.
     */
    const cases: { name: string; run: () => Promise<unknown> }[] = [
      {
        name: "getCompanyOpenBookingsAction (expõe PII de clientes)",
        run: async () => {
          const m = await import("@/server/actions/preset-reset-request");
          return m.getCompanyOpenBookingsAction(A.slug);
        },
      },
      {
        name: "updateBookingStatusDirectAction (escrita cross-tenant)",
        run: async () => {
          const m = await import("@/server/actions/preset-reset-request");
          return m.updateBookingStatusDirectAction(A.slug, "id-inexistente", "CANCELLED");
        },
      },
      {
        name: "submitPresetResetRequestAction (apaga o catálogo)",
        run: async () => {
          const m = await import("@/server/actions/preset-reset-request");
          return m.submitPresetResetRequestAction(A.slug, "teste");
        },
      },
      {
        name: "setProfessionalActiveAction",
        run: async () => {
          const m = await import("@/server/actions/professionals");
          const fd = new FormData();
          fd.set("companySlug", A.slug);
          fd.set("id", "id-inexistente");
          fd.set("isActive", "false");
          return m.setProfessionalActiveAction(fd);
        },
      },
      {
        name: "evaluateClientNoShowRiskAction (histórico de cliente)",
        run: async () => {
          const m = await import("@/server/actions/ai-copilot");
          return m.evaluateClientNoShowRiskAction(A.slug, "alguem@exemplo.com");
        },
      },
    ];

    for (const c of cases) {
      it(`${c.name} — nega sem sessão`, async () => {
        currentUser = null;
        expect(await denied(c.run)).toBe(true);
      });

      it(`${c.name} — nega dono de outra empresa`, async () => {
        currentUser = { id: B.user, email: "b@vitest.local", name: "B" };
        expect(await denied(c.run)).toBe(true);
      });
    }
  });

  describe("actions de plataforma", () => {
    const cases: { name: string; run: () => Promise<unknown> }[] = [
      {
        name: "getAllActiveCompanyLicensesAction",
        run: async () => {
          const m = await import("@/server/actions/admin-modules");
          return m.getAllActiveCompanyLicensesAction();
        },
      },
      {
        name: "getSystemModulesAction",
        run: async () => {
          const m = await import("@/server/actions/admin-modules");
          return m.getSystemModulesAction();
        },
      },
      {
        name: "getInfrastructureStatusAction",
        run: async () => {
          const m = await import("@/server/actions/admin-infra");
          return m.getInfrastructureStatusAction();
        },
      },
      {
        name: "getSuperAdminReportsAction",
        run: async () => {
          const m = await import("@/server/actions/reports");
          return m.getSuperAdminReportsAction();
        },
      },
      {
        name: "repairCompanyTenantAction (escreve no banco)",
        run: async () => {
          const m = await import("@/server/actions/admin-ai");
          return m.repairCompanyTenantAction(A.company);
        },
      },
    ];

    for (const c of cases) {
      it(`${c.name} — nega usuário comum`, async () => {
        currentUser = { id: A.user, email: "a@vitest.local", name: "A" };
        expect(await denied(c.run)).toBe(true);
      });

      it(`${c.name} — nega sem sessão`, async () => {
        currentUser = null;
        expect(await denied(c.run)).toBe(true);
      });
    }
  });

  describe("módulos licenciados de uma empresa", () => {
    it("não vaza os módulos de outra empresa", async () => {
      const m = await import("@/server/actions/admin-modules");
      currentUser = { id: B.user, email: "b@vitest.local", name: "B" };
      expect(await m.getCompanyLicensedModuleCodesAction(A.slug)).toEqual([]);
    });
  });
});
