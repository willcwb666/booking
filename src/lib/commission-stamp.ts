import "server-only";
import { db } from "@/lib/db";
import { resolveRates } from "@/lib/commission-rates";

/**
 * Carimba a comissão do agendamento no momento em que ele é concluído.
 *
 * ─── Por que na conclusão, e não na criação ──────────────────────────────────
 *
 * Antes de o atendimento acontecer não há comissão devida — o agendamento pode
 * ser cancelado, remarcado, ou ter o valor ajustado no fechamento. Carimbar na
 * criação congelaria um número sobre trabalho que ainda não foi feito.
 *
 * A conclusão é o instante em que as duas pontas ficam conhecidas ao mesmo
 * tempo: o valor final do orçamento e a taxa vigente do profissional.
 *
 * ─── Idempotente por construção ──────────────────────────────────────────────
 *
 * O `updateMany` só grava onde `commissionAmount` ainda é nulo. Concluir duas
 * vezes — ou reprocessar — não reescreve um carimbo existente, que é o ponto
 * inteiro dele: uma vez carimbado, o número para de mudar.
 */
export async function stampBookingCommission(bookingId: string): Promise<void> {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: {
        commissionAmount: true,
        estimate: { select: { total: true } },
        professional: {
          select: {
            commissionPercentage: true,
            commissionRate: true,
            productCommissionRate: true,
          },
        },
      },
    });

    // Sem profissional não há a quem pagar comissão; sem orçamento não há sobre
    // o quê calcular. Nos dois casos não há carimbo a fazer.
    if (!booking || booking.commissionAmount !== null) return;
    if (!booking.professional || !booking.estimate) return;

    const rates = resolveRates(booking.professional);
    const total = Number(booking.estimate.total);
    if (!Number.isFinite(total) || total <= 0) return;

    const commission = Math.round(((total * rates.service) / 100) * 100) / 100;

    await db.booking.updateMany({
      where: { id: bookingId, commissionAmount: null },
      data: { commissionAmount: commission, commissionRate: rates.service },
    });
  } catch (err) {
    /**
     * Falhar aqui não pode desfazer a conclusão do atendimento.
     *
     * O extrato tem recurso: sem carimbo, ele calcula com a taxa atual, que é
     * exatamente o comportamento de antes. Perder o carimbo degrada o histórico
     * de um atendimento; derrubar a conclusão impede o profissional de fechar a
     * comanda com o cliente na frente dele.
     */
    console.error("[commission-stamp] falha ao carimbar", bookingId, err);
  }
}
