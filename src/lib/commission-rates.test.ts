import { describe, expect, it } from "vitest";
import { commissionForItem, resolveRates } from "./commission-rates";

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
