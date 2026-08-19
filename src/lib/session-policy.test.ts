import { describe, it, expect, beforeAll } from "vitest";

// db.ts instancia o PrismaClient no import (o pool é lazy, não conecta aqui).
beforeAll(() => {
  process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/test";
});

async function load() {
  return import("./session-policy");
}

function headersOf(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("detectSessionClient", () => {
  it("assume WEB quando não há pistas", async () => {
    const { detectSessionClient } = await load();
    expect(detectSessionClient(headersOf({}))).toBe("WEB");
    expect(detectSessionClient(null)).toBe("WEB");
    expect(detectSessionClient(undefined)).toBe("WEB");
  });

  it("respeita o header explícito x-client", async () => {
    const { detectSessionClient } = await load();
    expect(detectSessionClient(headersOf({ "x-client": "mobile" }))).toBe("MOBILE");
    expect(detectSessionClient(headersOf({ "x-client": "MOBILE" }))).toBe("MOBILE");
    expect(detectSessionClient(headersOf({ "x-client": " Mobile " }))).toBe("MOBILE");
    expect(detectSessionClient(headersOf({ "x-client": "web" }))).toBe("WEB");
  });

  it("o header explícito vence o User-Agent", async () => {
    const { detectSessionClient } = await load();
    const h = headersOf({ "x-client": "web", "user-agent": "okhttp/4.9" });
    expect(detectSessionClient(h)).toBe("WEB");
  });

  it("cai no User-Agent para builds antigas do app que não mandam o header", async () => {
    const { detectSessionClient } = await load();
    expect(detectSessionClient(headersOf({ "user-agent": "okhttp/4.9.3" }))).toBe("MOBILE");
    expect(detectSessionClient(headersOf({ "user-agent": "Expo/2.30 CFNetwork" }))).toBe("MOBILE");
  });

  it("não confunde navegador comum com app nativo", async () => {
    const { detectSessionClient } = await load();
    const chrome =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
    const safariIos =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
    expect(detectSessionClient(headersOf({ "user-agent": chrome }))).toBe("WEB");
    // Safari no iPhone é NAVEGADOR: precisa continuar sob a política do painel
    expect(detectSessionClient(headersOf({ "user-agent": safariIos }))).toBe("WEB");
  });
});
