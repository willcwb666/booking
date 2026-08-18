import "server-only";
import { db } from "./db";

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

    // Estorna gift card: devolve o saldo debitado, reativa o cartão (pode ter
    // ficado EXHAUSTED) e remove o registro de resgate.
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

    // Estorna crédito de sessão (apenas planos com saldo finito; ilimitados têm
    // remainingSessions null e não decrementam), removendo o registro de uso.
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
