import { describe, it, expect } from "vitest";
import {
  toStripeCents,
  calculateCommission,
  calculateDeposit,
  calculateCancellationRefund,
  resolveOnlineChargeAmount,
  computeBookingCharge,
} from "./pricing";

describe("toStripeCents", () => {
  it("converte reais para centavos", () => {
    expect(toStripeCents(19.99)).toBe(1999);
    expect(toStripeCents(0)).toBe(0);
    expect(toStripeCents(100)).toBe(10000);
  });

  it("arredonda para o centavo mais próximo (sem erro de ponto flutuante)", () => {
    // 1.1 * 100 = 110.00000000000001 em float; deve resultar em 110
    expect(toStripeCents(1.1)).toBe(110);
    expect(toStripeCents(2.675)).toBe(268); // 2.675 → 267.5 → 268
  });
});

describe("calculateCommission", () => {
  it("aplica o percentual sobre o total", () => {
    expect(calculateCommission(200, 30)).toEqual({ commission: 60, companyRetained: 140 });
  });

  it("0% não gera comissão; a empresa retém tudo", () => {
    expect(calculateCommission(150, 0)).toEqual({ commission: 0, companyRetained: 150 });
  });

  it("100% repassa todo o valor ao profissional", () => {
    expect(calculateCommission(150, 100)).toEqual({ commission: 150, companyRetained: 0 });
  });

  it("percentual negativo é tratado como 0 (nunca comissão negativa)", () => {
    expect(calculateCommission(150, -10)).toEqual({ commission: 0, companyRetained: 150 });
  });

  it("total zero resulta em comissão zero", () => {
    expect(calculateCommission(0, 50)).toEqual({ commission: 0, companyRetained: 0 });
  });
});

describe("calculateDeposit", () => {
  it("calcula o sinal como percentual do total e o restante", () => {
    expect(calculateDeposit(200, 30)).toEqual({ deposit: 60, remaining: 140 });
  });

  it("sinal de 100% deixa restante zero", () => {
    expect(calculateDeposit(200, 100)).toEqual({ deposit: 200, remaining: 0 });
  });

  it("sinal de 0% não cobra nada adiantado", () => {
    expect(calculateDeposit(200, 0)).toEqual({ deposit: 0, remaining: 200 });
  });
});

describe("resolveOnlineChargeAmount", () => {
  it("sem exigência de sinal: cobra o total", () => {
    expect(
      resolveOnlineChargeAmount({ total: 200, requireDeposit: false, depositPercentage: 30 }),
    ).toBe(200);
  });

  it("com exigência de sinal: cobra apenas o percentual", () => {
    expect(
      resolveOnlineChargeAmount({ total: 200, requireDeposit: true, depositPercentage: 30 }),
    ).toBe(60);
  });

  it("arredonda o sinal para 2 casas decimais (exigência de PIX/Stripe)", () => {
    // 199.99 * 30% = 59.997 → 60.00
    expect(
      resolveOnlineChargeAmount({ total: 199.99, requireDeposit: true, depositPercentage: 30 }),
    ).toBe(60);
  });

  it("sinal de 100% equivale a cobrar o total", () => {
    expect(
      resolveOnlineChargeAmount({ total: 150, requireDeposit: true, depositPercentage: 100 }),
    ).toBe(150);
  });
});

describe("computeBookingCharge", () => {
  const base = { requireDeposit: false, depositPercentage: 30 };

  it("sem cobertura/desconto/gift: cobra o total", () => {
    expect(
      computeBookingCharge({ total: 200, membershipCovered: false, membershipDiscount: 0, giftCardDebit: 0, ...base }),
    ).toEqual({ amountDue: 200, onlineCharge: 200 });
  });

  it("cobertura total do plano: nada a pagar", () => {
    expect(
      computeBookingCharge({ total: 200, membershipCovered: true, membershipDiscount: 0, giftCardDebit: 0, ...base }),
    ).toEqual({ amountDue: 0, onlineCharge: 0 });
  });

  it("cobertura total ignora gift/desconto residual", () => {
    expect(
      computeBookingCharge({ total: 200, membershipCovered: true, membershipDiscount: 50, giftCardDebit: 30, ...base }),
    ).toEqual({ amountDue: 0, onlineCharge: 0 });
  });

  it("desconto de membro reduz o valor devido", () => {
    // 20% de desconto sobre 200 = 160
    expect(
      computeBookingCharge({ total: 200, membershipCovered: false, membershipDiscount: 40, giftCardDebit: 0, ...base }),
    ).toEqual({ amountDue: 160, onlineCharge: 160 });
  });

  it("gift card parcial abate do valor devido", () => {
    expect(
      computeBookingCharge({ total: 200, membershipCovered: false, membershipDiscount: 0, giftCardDebit: 75, ...base }),
    ).toEqual({ amountDue: 125, onlineCharge: 125 });
  });

  it("gift card >= total: nada a pagar online", () => {
    expect(
      computeBookingCharge({ total: 200, membershipCovered: false, membershipDiscount: 0, giftCardDebit: 200, ...base }),
    ).toEqual({ amountDue: 0, onlineCharge: 0 });
  });

  it("desconto + gift combinados", () => {
    // 200 - 40 (20%) = 160; gift 60 → devido 100
    expect(
      computeBookingCharge({ total: 200, membershipCovered: false, membershipDiscount: 40, giftCardDebit: 60, ...base }),
    ).toEqual({ amountDue: 100, onlineCharge: 100 });
  });

  it("com sinal exigido, cobra o percentual do valor devido (não do total)", () => {
    // devido = 200 - 100 (gift) = 100; sinal 30% = 30
    expect(
      computeBookingCharge({
        total: 200,
        membershipCovered: false,
        membershipDiscount: 0,
        giftCardDebit: 100,
        requireDeposit: true,
        depositPercentage: 30,
      }),
    ).toEqual({ amountDue: 100, onlineCharge: 30 });
  });
});

describe("calculateCancellationRefund", () => {
  it("cancelamento com antecedência: reembolso integral, sem taxa", () => {
    expect(
      calculateCancellationRefund({ total: 200, cancellationFee: 50, isLateCancellation: false }),
    ).toEqual({ refundAmount: 200, feeApplied: 0, isFullRefund: true });
  });

  it("cancelamento tardio sem taxa configurada: reembolso integral", () => {
    expect(
      calculateCancellationRefund({ total: 200, cancellationFee: 0, isLateCancellation: true }),
    ).toEqual({ refundAmount: 200, feeApplied: 0, isFullRefund: true });
  });

  it("cancelamento tardio com taxa: retém a taxa e devolve o restante", () => {
    expect(
      calculateCancellationRefund({ total: 200, cancellationFee: 50, isLateCancellation: true }),
    ).toEqual({ refundAmount: 150, feeApplied: 50, isFullRefund: false });
  });

  it("taxa maior que o total: reembolso zero e taxa limitada ao total", () => {
    expect(
      calculateCancellationRefund({ total: 40, cancellationFee: 50, isLateCancellation: true }),
    ).toEqual({ refundAmount: 0, feeApplied: 40, isFullRefund: false });
  });

  it("taxa igual ao total: reembolso zero", () => {
    expect(
      calculateCancellationRefund({ total: 50, cancellationFee: 50, isLateCancellation: true }),
    ).toEqual({ refundAmount: 0, feeApplied: 50, isFullRefund: false });
  });
});

describe("computeBookingCharge — desconto de horário ocioso", () => {
  const base = {
    membershipCovered: false,
    membershipDiscount: 0,
    giftCardDebit: 0,
    requireDeposit: false,
    depositPercentage: 30,
  };

  it("abate o desconto do valor devido", () => {
    const r = computeBookingCharge({ ...base, total: 100, offPeakDiscount: 15 });
    expect(r.amountDue).toBe(85);
    expect(r.onlineCharge).toBe(85);
  });

  it("ausente equivale a zero — chamadas antigas não mudam de resultado", () => {
    expect(computeBookingCharge({ ...base, total: 100 }).amountDue).toBe(100);
    expect(computeBookingCharge({ ...base, total: 100, offPeakDiscount: 0 }).amountDue).toBe(100);
  });

  it("vem ANTES do gift card, para não queimar saldo do vale", () => {
    // 100 com 20 de desconto = 80 devidos; o vale de 50 abate esses 80.
    // Na ordem inversa o vale pagaria 50 de 100 e o desconto incidiria sobre o
    // resto — o cliente gastaria 50 de vale para uma conta de 80.
    const r = computeBookingCharge({
      ...base,
      total: 100,
      offPeakDiscount: 20,
      giftCardDebit: 50,
    });
    expect(r.amountDue).toBe(30);
  });

  it("combina com desconto de membro sem ficar negativo", () => {
    const r = computeBookingCharge({
      ...base,
      total: 100,
      offPeakDiscount: 60,
      membershipDiscount: 60,
    });
    expect(r.amountDue).toBe(0);
    expect(r.onlineCharge).toBe(0);
  });

  it("o sinal incide sobre o valor JÁ com desconto", () => {
    // Cobrar 30% de 100 quando o cliente deve 80 seria sinal de 37,5% —
    // e o cliente conferiria a conta.
    const r = computeBookingCharge({
      ...base,
      total: 100,
      offPeakDiscount: 20,
      requireDeposit: true,
      depositPercentage: 30,
    });
    expect(r.amountDue).toBe(80);
    expect(r.onlineCharge).toBe(24);
  });

  it("cobertura por plano ignora o desconto — não há o que descontar", () => {
    const r = computeBookingCharge({
      ...base,
      total: 100,
      offPeakDiscount: 20,
      membershipCovered: true,
    });
    expect(r.amountDue).toBe(0);
  });
});
