import { describe, expect, it } from "vitest";
import {
  commissionForItem,
  resolveBookingCommission,
  resolveRates,
} from "./commission-rates";

describe("resolveRates", () => {
  it("prefere commissionRate ao campo legado", () => {
    expect(resolveRates({ commissionPercentage: 40, commissionRate: 55 }).service).toBe(55);
  });

  it("cai no legado quando commissionRate não foi configurado", () => {
    expect(resolveRates({ commissionPercentage: 40, commissionRate: null }).service).toBe(40);
  });

  it("respeita zero explícito em vez de ressuscitar o legado", () => {
    // O caso que um `??` ingênuo erraria: o dono zerou a comissão do
    // profissional e o sistema voltaria a pagar os 40% antigos.
    expect(resolveRates({ commissionPercentage: 40, commissionRate: 0 }).service).toBe(0);
  });

  it("sem taxa de produto, produto paga zero — não a taxa de serviço", () => {
    // Vender uma pomada não pode pagar como cortar cabelo por omissão.
    const r = resolveRates({ commissionPercentage: 50, commissionRate: 50 });
    expect(r.service).toBe(50);
    expect(r.product).toBe(0);
  });

  it("lê Decimal do Prisma, que chega como objeto ou string", () => {
    expect(resolveRates({ commissionRate: "12.5" }).service).toBe(12.5);
    expect(resolveRates({ productCommissionRate: "7" }).product).toBe(7);
  });

  it("descarta valor fora da faixa em vez de propagá-lo", () => {
    // 1400 vindo de um campo corrompido pagaria catorze vezes o serviço.
    expect(resolveRates({ commissionPercentage: 30, commissionRate: 1400 }).service).toBe(30);
    expect(resolveRates({ commissionRate: -5, commissionPercentage: 30 }).service).toBe(30);
    expect(resolveRates({ commissionRate: Number.NaN, commissionPercentage: 30 }).service).toBe(30);
  });

  it("profissional sem nada configurado não gera comissão", () => {
    expect(resolveRates({})).toEqual({ service: 0, product: 0 });
  });
});

describe("commissionForItem", () => {
  const rates = { service: 50, product: 10 };

  it("aplica a taxa do tipo do item", () => {
    expect(commissionForItem({ type: "SERVICE", totalPrice: 100, rates })).toBe(50);
    expect(commissionForItem({ type: "PRODUCT", totalPrice: 100, rates })).toBe(10);
  });

  it("taxa de conveniência (FEE) não gera comissão", () => {
    // Não é trabalho do profissional nem produto do estoque.
    expect(commissionForItem({ type: "FEE", totalPrice: 100, rates })).toBe(0);
  });

  it("tipo desconhecido não paga nada em vez de cair no serviço", () => {
    expect(commissionForItem({ type: "QUALQUER_COISA", totalPrice: 100, rates })).toBe(0);
  });

  it("valor não positivo não gera comissão", () => {
    expect(commissionForItem({ type: "SERVICE", totalPrice: 0, rates })).toBe(0);
    expect(commissionForItem({ type: "SERVICE", totalPrice: -50, rates })).toBe(0);
    expect(commissionForItem({ type: "SERVICE", totalPrice: Number.NaN, rates })).toBe(0);
  });
});

/**
 * O carimbo de comissão do agendamento.
 *
 * Existe porque o extrato recalculava com a taxa ATUAL do profissional toda vez
 * que a tela abria. Mudar a taxa de alguém reescrevia o que ele já tinha
 * ganhado — o fechamento da quinzena passada mudava de valor sozinho, depois de
 * pago.
 */
describe("resolveBookingCommission", () => {
  it("o carimbo vence a taxa atual", () => {
    // Carimbado 40 quando a taxa era 40%; hoje a taxa é 10%. O que ele ganhou
    // continua sendo 40.
    const r = resolveBookingCommission({
      stampedAmount: "40.00",
      stampedRate: "40.00",
      total: 100,
      currentRate: 10,
    });
    expect(r.commission).toBe(40);
    expect(r.rate).toBe(40);
    expect(r.stamped).toBe(true);
  });

  it("sem carimbo, calcula com a taxa atual — o comportamento antigo", () => {
    const r = resolveBookingCommission({
      stampedAmount: null,
      total: 100,
      currentRate: 30,
    });
    expect(r.commission).toBe(30);
    expect(r.stamped).toBe(false);
  });

  it("carimbo de zero é um carimbo, não ausência", () => {
    /**
     * "Este atendimento não gerou comissão" é uma informação, e precisa
     * sobreviver. Tratar zero como ausência faria o extrato recalcular e
     * inventar uma comissão que ninguém combinou.
     */
    const r = resolveBookingCommission({
      stampedAmount: 0,
      stampedRate: 0,
      total: 100,
      currentRate: 50,
    });
    expect(r.commission).toBe(0);
    expect(r.stamped).toBe(true);
  });

  it("carimbo corrompido cai para a taxa atual", () => {
    // Valor negativo ou não numérico não é carimbo — é dado ruim.
    for (const bad of [-10, "abc", Number.NaN]) {
      const r = resolveBookingCommission({
        stampedAmount: bad,
        total: 100,
        currentRate: 20,
      });
      expect(r.stamped).toBe(false);
      expect(r.commission).toBe(20);
    }
  });

  it("total inválido sem carimbo não vira NaN", () => {
    expect(
      resolveBookingCommission({ stampedAmount: null, total: Number.NaN, currentRate: 20 })
        .commission
    ).toBe(0);
  });
});
