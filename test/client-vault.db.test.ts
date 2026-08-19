import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cofre do cliente, contra o Postgres real.
 *
 * As três coisas que precisam ser verdade e que nenhum teste puro alcança:
 *
 *  1. **a licença guarda a porta.** Até este item, módulo licenciado era
 *     escondido do menu e nada mais — quem soubesse a URL entrava. Para um
 *     cofre de fotos de cliente isso seria outra categoria de problema;
 *  2. **apagar apaga o arquivo.** Se o armazenamento falhar, o registro fica de
 *     pé para nova tentativa. Linha apagada com arquivo vivo é um arquivo que
 *     ninguém mais consegue localizar quando o cliente pedir a exclusão;
 *  3. **o id de cliente vem com filtro de empresa.** É a mesma classe de IDOR
 *     fechada em 2026-08-18, aqui com o pior conteúdo possível.
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

/**
 * O armazenamento é simulado para poder FALHAR sob comando.
 *
 * É o único jeito de provar a regra que importa: quando o R2 recusa, o registro
 * não pode sumir. Em modo local o `deleteR2Object` real engole todo erro, e o
 * teste passaria sem testar nada.
 */
const storage = { deleted: [] as string[], shouldFail: false };

vi.mock("@/lib/r2", () => ({
  deleteR2Object: async (key: string) => {
    if (storage.shouldFail) throw new Error("R2 fora do ar");
    storage.deleted.push(key);
  },
  generatePresignedDownloadUrl: async (key: string) => `https://signed.local/${key}`,
  generatePresignedUploadUrl: async () => ({ uploadUrl: "", publicUrl: "", key: "" }),
  isPrivateUploadType: () => true,
}));

const P = "vitest-vault";
const A = { company: `${P}-company-a`, user: `${P}-user-a`, slug: `${P}-alpha`, customer: `${P}-cust-a` };
const B = { company: `${P}-company-b`, user: `${P}-user-b`, slug: `${P}-beta`, customer: `${P}-cust-b` };

const MODULE = "cofre_do_cliente";

let db: typeof import("@/lib/db").db;

async function cleanup() {
  for (const side of [A, B]) {
    await db.clientPhoto.deleteMany({ where: { companyId: side.company } });
    await db.serviceRecord.deleteMany({ where: { companyId: side.company } });
    await db.customer.deleteMany({ where: { companyId: side.company } });
    await db.companyModuleLicense.deleteMany({ where: { companyId: side.company } });
    await db.companyUser.deleteMany({ where: { companyId: side.company } });
    await db.company.deleteMany({ where: { id: side.company } });
    await db.user.deleteMany({ where: { id: side.user } });
  }
}

async function seed() {
  const plan = await db.plan.findFirst({ orderBy: { order: "asc" } });
  if (!plan) throw new Error("Sem planos no banco — rode o seed antes.");

  for (const side of [A, B]) {
    await db.user.create({
      data: {
        id: side.user,
        name: `Dono ${side.slug}`,
        email: `${side.user}@vitest.local`,
        emailVerified: true,
      },
    });
    await db.company.create({
      data: {
        id: side.company,
        name: `Salão ${side.slug}`,
        slug: side.slug,
        businessType: "HAIR_SALON",
        planId: plan.id,
        isActive: true,
        photoRetentionMonths: 24,
      },
    });
    await db.companyUser.create({
      data: { companyId: side.company, userId: side.user, role: "OWNER", isActive: true },
    });
    await db.customer.create({
      data: {
        id: side.customer,
        companyId: side.company,
        firstName: "Cliente",
        lastName: side.slug,
        email: `${side.customer}@vitest.local`,
        phone: "41999999999",
      },
    });
  }
}

async function license(companyId: string, over: { status?: string; expiresAt?: Date } = {}) {
  await db.companyModuleLicense.upsert({
    where: { companyId_moduleCode: { companyId, moduleCode: MODULE } },
    update: { status: over.status ?? "ACTIVE", expiresAt: over.expiresAt ?? null },
    create: {
      companyId,
      moduleCode: MODULE,
      status: over.status ?? "ACTIVE",
      expiresAt: over.expiresAt ?? null,
    },
  });
}

const photoInput = (over: Record<string, unknown> = {}) => ({
  customerId: A.customer,
  storageKey: `client-photo/${Math.random().toString(36).slice(2)}.jpg`,
  kind: "BEFORE",
  consentConfirmed: true as const,
  ...over,
});

d("cofre do cliente (integração)", () => {
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
    storage.deleted = [];
    storage.shouldFail = false;
    currentUser = { id: A.user, email: `${A.user}@vitest.local`, name: "Dono A" };
    await license(A.company);
    await db.companyModuleLicense.deleteMany({ where: { companyId: B.company } });
  });

  afterEach(async () => {
    for (const side of [A, B]) {
      await db.clientPhoto.deleteMany({ where: { companyId: side.company } });
      await db.serviceRecord.deleteMany({ where: { companyId: side.company } });
    }
  });

  describe("licença", () => {
    it("sem módulo contratado não grava foto", async () => {
      const m = await import("@/server/actions/client-vault");
      await db.companyModuleLicense.deleteMany({ where: { companyId: A.company } });

      const res = await m.addClientPhotoAction(A.slug, photoInput());
      expect(res.success).toBe(false);
      expect(await db.clientPhoto.count()).toBe(0);
    });

    it("licença revogada vale como não contratada", async () => {
      const m = await import("@/server/actions/client-vault");
      await license(A.company, { status: "REVOKED" });

      expect((await m.addClientPhotoAction(A.slug, photoInput())).success).toBe(false);
    });

    it("licença vencida não abre a porta", async () => {
      // Data de validade que não é verificada é decoração — e aqui significa
      // acesso de quem já saiu ao acervo de fotos.
      const m = await import("@/server/actions/client-vault");
      await license(A.company, { expiresAt: new Date(Date.now() - 60_000) });

      expect((await m.addClientPhotoAction(A.slug, photoInput())).success).toBe(false);
    });

    it("sem sessão não grava", async () => {
      const m = await import("@/server/actions/client-vault");
      currentUser = null;
      expect((await m.addClientPhotoAction(A.slug, photoInput())).success).toBe(false);
    });
  });

  describe("consentimento e retenção", () => {
    it("grava quem colheu a autorização e quando", async () => {
      const m = await import("@/server/actions/client-vault");
      expect((await m.addClientPhotoAction(A.slug, photoInput())).success).toBe(true);

      const photo = await db.clientPhoto.findFirst({ where: { companyId: A.company } });
      expect(photo?.consentById).toBe(A.user);
      expect(photo?.consentAt).toBeInstanceOf(Date);
      // 24 meses de guarda: o prazo tem de estar no futuro, sempre.
      expect(photo!.retainUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it("sem a confirmação de consentimento não grava", async () => {
      const m = await import("@/server/actions/client-vault");
      const res = await m.addClientPhotoAction(
        A.slug,
        photoInput({ consentConfirmed: false }) as never
      );
      expect(res.success).toBe(false);
      expect(await db.clientPhoto.count()).toBe(0);
    });

    it("momento inválido é recusado", async () => {
      const m = await import("@/server/actions/client-vault");
      expect((await m.addClientPhotoAction(A.slug, photoInput({ kind: "DURING" }))).success).toBe(
        false
      );
    });
  });

  describe("isolamento entre empresas", () => {
    it("cliente de outra empresa não recebe foto", async () => {
      const m = await import("@/server/actions/client-vault");
      const res = await m.addClientPhotoAction(A.slug, photoInput({ customerId: B.customer }));

      expect(res.success).toBe(false);
      expect(await db.clientPhoto.count({ where: { customerId: B.customer } })).toBe(0);
    });

    it("dono de A não apaga foto de B", async () => {
      const m = await import("@/server/actions/client-vault");
      await license(B.company);
      const alheia = await db.clientPhoto.create({
        data: {
          companyId: B.company,
          customerId: B.customer,
          storageKey: "client-photo/alheia.jpg",
          kind: "AFTER",
          consentAt: new Date(),
          consentById: B.user,
          retainUntil: new Date(Date.now() + 86400_000),
        },
      });

      const res = await m.deleteClientPhotoAction(A.slug, alheia.id);
      expect(res.success).toBe(false);
      expect(await db.clientPhoto.findUnique({ where: { id: alheia.id } })).not.toBeNull();
      expect(storage.deleted).toEqual([]);
    });
  });

  describe("exclusão", () => {
    it("apaga o arquivo antes do registro", async () => {
      const m = await import("@/server/actions/client-vault");
      const input = photoInput();
      await m.addClientPhotoAction(A.slug, input);
      const photo = await db.clientPhoto.findFirst({ where: { companyId: A.company } });

      expect((await m.deleteClientPhotoAction(A.slug, photo!.id)).success).toBe(true);
      expect(storage.deleted).toEqual([input.storageKey]);
      expect(await db.clientPhoto.findUnique({ where: { id: photo!.id } })).toBeNull();
    });

    it("armazenamento fora do ar mantém o registro para nova tentativa", async () => {
      // Apagar a linha aqui deixaria o arquivo no R2 sem nada apontando para
      // ele: invisível para o produto e impossível de localizar depois.
      const m = await import("@/server/actions/client-vault");
      await m.addClientPhotoAction(A.slug, photoInput());
      const photo = await db.clientPhoto.findFirst({ where: { companyId: A.company } });

      storage.shouldFail = true;
      expect((await m.deleteClientPhotoAction(A.slug, photo!.id)).success).toBe(false);
      expect(await db.clientPhoto.findUnique({ where: { id: photo!.id } })).not.toBeNull();
    });
  });

  describe("expurgo por prazo", () => {
    it("leva só o que venceu, e leva o arquivo junto", async () => {
      const { purgeExpiredClientPhotos } = await import("@/lib/vault-purge");

      await db.clientPhoto.create({
        data: {
          companyId: A.company,
          customerId: A.customer,
          storageKey: "client-photo/vencida.jpg",
          kind: "BEFORE",
          consentAt: new Date(),
          consentById: A.user,
          retainUntil: new Date(Date.now() - 86400_000),
        },
      });
      const viva = await db.clientPhoto.create({
        data: {
          companyId: A.company,
          customerId: A.customer,
          storageKey: "client-photo/viva.jpg",
          kind: "AFTER",
          consentAt: new Date(),
          consentById: A.user,
          retainUntil: new Date(Date.now() + 86400_000),
        },
      });

      const res = await purgeExpiredClientPhotos(50);
      expect(res.deleted).toBeGreaterThanOrEqual(1);
      expect(storage.deleted).toContain("client-photo/vencida.jpg");
      expect(await db.clientPhoto.findUnique({ where: { id: viva.id } })).not.toBeNull();
    });
  });

  describe("ficha técnica", () => {
    it("ficha em branco não é gravada", async () => {
      const m = await import("@/server/actions/client-vault");
      const res = await m.saveServiceRecordAction(A.slug, { customerId: A.customer, notes: "  " });
      expect(res.success).toBe(false);
      expect(await db.serviceRecord.count()).toBe(0);
    });

    it("um campo preenchido já é ficha, e campo vazio vira nulo", async () => {
      const m = await import("@/server/actions/client-vault");
      const res = await m.saveServiceRecordAction(A.slug, {
        customerId: A.customer,
        formula: "7.1 + 9.3",
        developer: "",
      });
      expect(res.success).toBe(true);

      const saved = await db.serviceRecord.findFirst({ where: { companyId: A.company } });
      expect(saved?.formula).toBe("7.1 + 9.3");
      // String vazia viraria uma sugestão em branco no próximo atendimento.
      expect(saved?.developer).toBeNull();
    });

    it("não edita ficha de outra empresa", async () => {
      const m = await import("@/server/actions/client-vault");
      const alheia = await db.serviceRecord.create({
        data: { companyId: B.company, customerId: B.customer, formula: "original" },
      });

      const res = await m.saveServiceRecordAction(
        A.slug,
        { customerId: A.customer, formula: "invadida" },
        alheia.id
      );
      expect(res.success).toBe(false);

      const after = await db.serviceRecord.findUnique({ where: { id: alheia.id } });
      expect(after?.formula).toBe("original");
    });
  });

  describe("leitura", () => {
    it("devolve link assinado, nunca a chave crua", async () => {
      const { getClientVault } = await import("@/server/queries/client-vault");
      const m = await import("@/server/actions/client-vault");
      await m.addClientPhotoAction(A.slug, photoInput({ storageKey: "client-photo/x.jpg" }));

      const vault = await getClientVault({ companyId: A.company, customerId: A.customer });
      expect(vault.photos).toHaveLength(1);
      expect(vault.photos[0].url).toBe("https://signed.local/client-photo/x.jpg");
    });

    it("o autocomplete não atravessa empresas", async () => {
      const { getClientVault } = await import("@/server/queries/client-vault");
      await db.serviceRecord.create({
        data: { companyId: B.company, customerId: B.customer, formula: "segredo da concorrente" },
      });

      const vault = await getClientVault({ companyId: A.company, customerId: A.customer });
      expect(vault.suggestions.formula).not.toContain("segredo da concorrente");
    });
  });
});
