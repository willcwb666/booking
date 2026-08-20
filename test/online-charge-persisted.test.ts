import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A outra metade da correção do webhook do Mercado Pago.
 *
 * `test/mp-webhook.db.test.ts` prova que o webhook recusa pagamento a menor —
 * mas ele semeia o valor devido direto no banco. Se a criação do agendamento
 * parar de gravar `onlineChargeAmount`, o webhook passa a cair no caminho
 * "não há como conferir" e confirma tudo de novo, com os três testes de lá
 * continuando verdes. A conferência viraria enfeite sem ninguém perceber.
 *
 * Este arquivo amarra as duas pontas: onde o id do pagamento é gravado, o
 * valor devido tem que ser gravado junto.
 *
 * ─── Por que ler o fonte em vez de rodar a action ────────────────────────────
 *
 * `createBookingAction` depende de sessão, limite de taxa, agenda, orçamento,
 * gateway e calendário. Montar tudo isso para observar UMA escrita custaria
 * mais do que entrega. A leitura estática é mais fraca — não prova que o valor
 * está CORRETO, e o teste do webhook é quem cobre isso — mas é exata sobre o
 * que precisa guardar: o acoplamento entre os dois campos.
 */

const ACTION = path.join(process.cwd(), "src", "server", "actions", "booking.ts");

/**
 * Comentários fora antes de asserir.
 *
 * Os comentários deste projeto explicam o defeito CITANDO o código errado. Sem
 * remover, o teste acha a menção e conclui o contrário do que é verdade.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
}

describe("valor devido gravado na abertura da cobrança", () => {
  const source = stripComments(fs.readFileSync(ACTION, "utf8"));

  it("grava `onlineChargeAmount` junto do id do pagamento do Mercado Pago", () => {
    const write = source.match(/data:\s*\{[^}]*mercadoPagoPaymentId[^}]*\}/);
    expect(write, "nenhuma escrita de mercadoPagoPaymentId encontrada").not.toBeNull();
    expect(write![0]).toContain("onlineChargeAmount");
  });

  it("grava `onlineChargeAmount` junto do id do PaymentIntent do Stripe", () => {
    // O Stripe não precisa da conferência — o evento vem amarrado ao intent
    // que criamos — mas o valor devido serve ao extrato e à conciliação.
    const write = source.match(/data:\s*\{[^}]*stripePaymentIntentId[^}]*\}/);
    expect(write, "nenhuma escrita de stripePaymentIntentId encontrada").not.toBeNull();
    expect(write![0]).toContain("onlineChargeAmount");
  });

  it("grava o valor que foi realmente pedido ao gateway", () => {
    // `onlineCharge` é o que `computeBookingCharge` devolve e o que vai no
    // `transaction_amount` do PIX. Gravar `amountDue` ou o total do orçamento
    // faria a conferência recusar todo agendamento com sinal.
    expect(source).toMatch(/onlineChargeAmount:\s*onlineCharge\b/);
  });
});
