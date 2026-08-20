import "server-only";
import { db } from "./db";

/** Cliente de transação do Prisma, como o `$transaction(async (tx) => …)` entrega. */
type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Devolve ao cliente o que ele gastou que não é dinheiro: saldo de vale-presente
 * e crédito de sessão de plano.
 *
 * ─── Por que virou função separada ───────────────────────────────────────────
 *
 * Isto só existia dentro do fluxo de "pagamento falhou". O cancelamento de um
 * agendamento PAGO — o caso comum, o cliente ligando para desmarcar — não
 * passava por aqui: estornava o cartão e pronto.
 *
 * O efeito era o cliente perder dinheiro ao cancelar. Serviço de 100 pago com
 * 40 de vale e 60 no cartão: o cancelamento devolvia os 60 e os 40 de saldo
 * evaporavam. Com plano, a sessão consumida também não voltava — o cliente
 * cancelava e continuava com uma sessão a menos no pacote.
 *
 * Idempotente: o resgate é APAGADO junto com a devolução, então rodar duas
 * vezes não credita duas vezes.
 */
export async function restoreBookingCredits(tx: Tx, bookingId: string): Promise<void> {
  // Gift card: devolve o saldo, reativa o cartão (pode ter ficado EXHAUSTED) e
  // remove o registro de resgate.
  const redemptions = await tx.giftCardRedemption.findMany({
    where: { bookingId },
    select: { id: true, giftCardId: true, amount: true },
  });
  for (const r of redemptions) {
    await tx.giftCard.update({
      where: { id: r.giftCardId },
      data: { currentBalance: { increment: Number(r.amount) }, status: "ACTIVE" },
    });
    await tx.giftCardRedemption.delete({ where: { id: r.id } });
  }

  // Crédito de sessão (apenas planos com saldo finito; ilimitados têm
  // remainingSessions null e não decrementam).
  const usages = await tx.membershipUsage.findMany({
    where: { bookingId },
    select: { id: true, customerMembershipId: true },
  });
  for (const u of usages) {
    await tx.customerMembership.updateMany({
      where: { id: u.customerMembershipId, remainingSessions: { not: null } },
      data: { remainingSessions: { increment: 1 } },
    });
    await tx.membershipUsage.delete({ where: { id: u.id } });
  }
}

/**
 * Cancela um agendamento cujo pagamento falhou/expirou (cartão ou PIX),
 * estornando resgates de gift card e créditos de sessão de assinatura, e
 * liberando o slot para outros clientes.
 *
 * Idempotente: se o agendamento já estiver CANCELLED, não faz nada — evita
 * estorno duplicado quando o gateway reentrega o webhook.
 */
export async function revertAndCancelUnpaidBooking(
  bookingId: string,
  reason: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });
    if (!booking || booking.status === "CANCELLED") return;

    await restoreBookingCredits(tx, bookingId);

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "FAILED",
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
    await tx.bookingSlot.deleteMany({ where: { bookingId } });
  });
}
