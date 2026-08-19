import { describe, it, expect } from "vitest";
import { generateSignedCheckinToken, verifySignedCheckinToken } from "./signed-token";

describe("Signed Check-in Tokens (HMAC-SHA256)", () => {
  const bookingId = "bk_test_123";
  const companyId = "comp_test_456";

  it("gera e valida token assinado com sucesso dentro da validade", () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1h no futuro
    const token = generateSignedCheckinToken(bookingId, companyId, futureTimestamp);

    const result = verifySignedCheckinToken(bookingId, companyId, token, futureTimestamp);
    expect(result.valid).toBe(true);
  });

  it("rejeita token quando expirado", () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 300; // 5 min no passado
    const token = generateSignedCheckinToken(bookingId, companyId, pastTimestamp);

    const result = verifySignedCheckinToken(bookingId, companyId, token, pastTimestamp);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expirado");
  });

  it("rejeita token forjado ou alterado", () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
    const fakeToken = "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678";

    const result = verifySignedCheckinToken(bookingId, companyId, fakeToken, futureTimestamp);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("inválido");
  });
});
