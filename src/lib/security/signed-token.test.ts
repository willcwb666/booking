import { describe, it, expect } from "vitest";
import {
  generateSignedCheckinToken,
  verifySignedCheckinToken,
  generateSignedReviewToken,
  verifySignedReviewToken,
} from "./signed-token";

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

describe("token de avaliação", () => {
  const bookingId = "booking-abc";
  const companyId = "company-xyz";
  const future = Math.floor(Date.now() / 1000) + 3600;
  const past = Math.floor(Date.now() / 1000) - 10;

  it("valida um token íntegro", () => {
    const token = generateSignedReviewToken(bookingId, companyId, future);
    expect(verifySignedReviewToken(bookingId, companyId, token, future).valid).toBe(true);
  });

  it("recusa depois do prazo", () => {
    const token = generateSignedReviewToken(bookingId, companyId, past);
    expect(verifySignedReviewToken(bookingId, companyId, token, past).valid).toBe(false);
  });

  it("recusa token de outro agendamento", () => {
    const token = generateSignedReviewToken("outro-booking", companyId, future);
    expect(verifySignedReviewToken(bookingId, companyId, token, future).valid).toBe(false);
  });

  it("token de check-in NÃO vale como token de avaliação", () => {
    // Sem o prefixo `review:` no payload, os dois recursos assinariam a mesma
    // string com a mesma chave — e um link de check-in viraria link de
    // avaliação de qualquer agendamento.
    const checkin = generateSignedCheckinToken(bookingId, companyId, future);
    expect(verifySignedReviewToken(bookingId, companyId, checkin, future).valid).toBe(false);
  });

  it("e o inverso também", () => {
    const review = generateSignedReviewToken(bookingId, companyId, future);
    expect(verifySignedCheckinToken(bookingId, companyId, review, future).valid).toBe(false);
  });

  it("token curto devolve inválido em vez de lançar", () => {
    expect(() =>
      verifySignedReviewToken(bookingId, companyId, "abc", future)
    ).not.toThrow();
    expect(verifySignedReviewToken(bookingId, companyId, "abc", future).valid).toBe(false);
  });
});
