import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { checkAndTouchSession, enforceSingleWebSession, invalidateStaffCache } from "@/lib/session-policy";
import { savePlatformSettings } from "@/lib/platform-settings";

/**
 * Teste de integração da política de sessão contra o Postgres de
 * desenvolvimento. Só roda com `RUN_DB_TESTS=1` — a suíte padrão continua
 * sendo puramente unitária e sem infraestrutura.
 *
 *   RUN_DB_TESTS=1 npx vitest run test/session-policy.db.test.ts
 */
const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

const USER_ID = "vitest-session-policy-user";

async function cleanup() {
  await db.session.deleteMany({ where: { userId: USER_ID } });
  await db.user.deleteMany({ where: { id: USER_ID } });
}

async function mkSession(id: string, client: string, idleMinutes: number) {
  return db.session.create({
    data: {
      id,
      token: `tok-${id}`,
      userId: USER_ID,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
      updatedAt: new Date(),
      client,
      lastActivityAt: new Date(Date.now() - idleMinutes * 60_000),
    },
  });
}

d("política de sessão (integração)", () => {
  beforeAll(async () => {
    await cleanup();
    await db.user.create({
      data: {
        id: USER_ID,
        name: "Vitest",
        email: "vitest-session-policy@test.local",
        emailVerified: false,
      },
    });
    await savePlatformSettings({
      sessionIdleStaffMinutes: 5,
      sessionIdleCustomerMinutes: 60,
      sessionIdleMobileMinutes: 0,
      singleWebSessionEnabled: true,
    });
    invalidateStaffCache();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("cliente final ocioso 10min continua logado (limite dele é 60)", async () => {
    await mkSession("s-customer", "WEB", 10);
    const res = await checkAndTouchSession({
      sessionId: "s-customer",
      userId: USER_ID,
      role: null,
      client: "WEB",
      lastActivityAt: new Date(Date.now() - 10 * 60_000),
    });
    expect(res).toEqual({ ok: true });
  });

  it("staff ocioso 10min é bloqueado E tem a sessão revogada no banco", async () => {
    const res = await checkAndTouchSession({
      sessionId: "s-customer",
      userId: USER_ID,
      role: "admin",
      client: "WEB",
      lastActivityAt: new Date(Date.now() - 10 * 60_000),
    });
    expect(res).toEqual({ ok: false, reason: "IDLE_TIMEOUT" });

    // Revogar (e não só recusar) é o que torna inútil um cookie roubado.
    const row = await db.session.findUnique({ where: { id: "s-customer" } });
    expect(row).toBeNull();
  });

  it("sessão mobile não morre com o timeout do painel", async () => {
    await mkSession("s-mobile", "MOBILE", 1440);
    const res = await checkAndTouchSession({
      sessionId: "s-mobile",
      userId: USER_ID,
      role: "admin",
      client: "MOBILE",
      lastActivityAt: new Date(Date.now() - 24 * 3_600_000),
    });
    expect(res).toEqual({ ok: true });
  });

  it("acesso dentro do limite renova lastActivityAt", async () => {
    await mkSession("s-touch", "WEB", 2);
    await checkAndTouchSession({
      sessionId: "s-touch",
      userId: USER_ID,
      role: "admin",
      client: "WEB",
      lastActivityAt: new Date(Date.now() - 2 * 60_000),
    });
    const row = await db.session.findUnique({ where: { id: "s-touch" } });
    expect(Date.now() - (row?.lastActivityAt.getTime() ?? 0)).toBeLessThan(5_000);
  });

  it("login novo derruba as outras sessões WEB e preserva a MOBILE", async () => {
    await mkSession("s-old-web", "WEB", 1);
    await mkSession("s-new-web", "WEB", 0);

    const killed = await enforceSingleWebSession({ userId: USER_ID, keepSessionId: "s-new-web" });
    expect(killed).toBe(2); // s-touch e s-old-web

    const rest = await db.session.findMany({ where: { userId: USER_ID }, orderBy: { id: "asc" } });
    expect(rest.map((r) => `${r.id}:${r.client}`)).toEqual(["s-mobile:MOBILE", "s-new-web:WEB"]);
  });
});

/**
 * Fluxo real do better-auth: confirma que o databaseHook grava a origem da
 * sessão e que o segundo login pelo navegador derruba o primeiro. É a parte
 * que nenhum teste unitário cobre — depende do wiring dentro da lib.
 */
d("better-auth: origem da sessão e sessão única (integração)", () => {
  const EMAIL = "vitest-auth-flow@test.local";
  const PASSWORD = "SenhaDeTeste!2026";
  let userId: string;

  async function purge() {
    const u = await db.user.findFirst({ where: { email: EMAIL }, select: { id: true } });
    if (!u) return;
    await db.session.deleteMany({ where: { userId: u.id } });
    await db.account.deleteMany({ where: { userId: u.id } });
    await db.user.delete({ where: { id: u.id } });
  }

  beforeAll(async () => {
    await purge();
    const { auth } = await import("@/lib/auth");
    await auth.api.signUpEmail({
      body: { email: EMAIL, password: PASSWORD, name: "Vitest Auth" },
      headers: new Headers({ "user-agent": "Mozilla/5.0 Chrome/130.0" }),
    });
    const u = await db.user.findFirstOrThrow({ where: { email: EMAIL }, select: { id: true } });
    userId = u.id;
    // O cadastro já abre uma sessão; começamos a contar a partir do zero.
    await db.session.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await purge();
  });

  it("login pelo navegador grava client=WEB e lastActivityAt", async () => {
    const { auth } = await import("@/lib/auth");
    await auth.api.signInEmail({
      body: { email: EMAIL, password: PASSWORD },
      headers: new Headers({ "user-agent": "Mozilla/5.0 Chrome/130.0" }),
    });

    const sessions = await db.session.findMany({ where: { userId } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].client).toBe("WEB");
    expect(Date.now() - sessions[0].lastActivityAt.getTime()).toBeLessThan(10_000);
  });

  it("login do app mobile grava client=MOBILE e NÃO derruba a sessão web", async () => {
    const { auth } = await import("@/lib/auth");
    await auth.api.signInEmail({
      body: { email: EMAIL, password: PASSWORD },
      headers: new Headers({ "x-client": "mobile", "user-agent": "okhttp/4.9" }),
    });

    const sessions = await db.session.findMany({ where: { userId }, orderBy: { client: "asc" } });
    expect(sessions.map((s) => s.client)).toEqual(["MOBILE", "WEB"]);
  });

  it("segundo login pelo navegador derruba o primeiro, mantendo o mobile", async () => {
    const { auth } = await import("@/lib/auth");
    await auth.api.signInEmail({
      body: { email: EMAIL, password: PASSWORD },
      headers: new Headers({ "user-agent": "Mozilla/5.0 Firefox/133.0" }),
    });

    const sessions = await db.session.findMany({ where: { userId } });
    expect(sessions).toHaveLength(2);
    expect(sessions.filter((s) => s.client === "WEB")).toHaveLength(1);
    expect(sessions.filter((s) => s.client === "MOBILE")).toHaveLength(1);
  });
});
