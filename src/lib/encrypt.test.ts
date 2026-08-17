import { describe, it, expect, beforeAll } from "vitest";

// A chave é lida de process.env a cada chamada, então basta defini-la antes de
// importar/usar. 64 hex chars = 32 bytes (AES-256).
beforeAll(() => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
});

// Import dinâmico após o env estar definido (evita depender da ordem de import).
async function load() {
  return import("./encrypt");
}

describe("encrypt/decrypt (AES-256-GCM)", () => {
  it("faz round-trip do texto original", async () => {
    const { encrypt, decrypt } = await load();
    const secret = "mp_access_token_ABC123";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("preserva unicode/acentos", async () => {
    const { encrypt, decrypt } = await load();
    const secret = "chave-pix: joão@emprésa.com 💳";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("o texto cifrado difere do texto puro", async () => {
    const { encrypt } = await load();
    const plain = "segredo";
    expect(encrypt(plain)).not.toContain(plain);
  });

  it("cifrar o mesmo texto duas vezes gera saídas diferentes (IV aleatório)", async () => {
    const { encrypt, decrypt } = await load();
    const plain = "token-repetido";
    const a = encrypt(plain);
    const b = encrypt(plain);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(decrypt(b));
  });

  it("detecta adulteração do ciphertext (auth tag do GCM)", async () => {
    const { encrypt, decrypt } = await load();
    const encoded = encrypt("valor-sensivel");
    // Altera o último caractere hex do bloco de dados
    const last = encoded.at(-1) === "0" ? "1" : "0";
    const tampered = encoded.slice(0, -1) + last;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("rejeita chave com tamanho inválido", async () => {
    const { encrypt } = await load();
    const original = process.env.ENCRYPTION_KEY;
    process.env.ENCRYPTION_KEY = "curta";
    expect(() => encrypt("x")).toThrow(/64 hex/);
    process.env.ENCRYPTION_KEY = original;
  });
});
