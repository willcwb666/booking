import "server-only";
import { db } from "@/lib/db";
import { enqueueNotification } from "@/lib/notification-outbox";
import { REVIEW_REQUEST_DELAY_MINUTES } from "@/lib/review-policy";

/**
 * Agenda o pedido de avaliação de um atendimento concluído.
 *
 * O atraso é o ponto: pedir na hora, com o cliente ainda na cadeira ou no
 * balcão, produz nota inflada por constrangimento — e nota inflada não avisa o
 * dono de nada, que é justamente o que o recurso deveria fazer.
 *
 * Implementado com `nextAttemptAt` da fila de saída, que já existe para o
 * backoff. Não é preciso agendador novo: a fila só considera elegível o que já
 * passou desse instante.
 */
export async function enqueueReviewRequest(bookingId: string): Promise<void> {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, companyId: true, reviewRequestedAt: true },
    });
    // Já pedido antes: concluir um agendamento duas vezes (correção de status,
    // reprocessamento) não pode gerar um segundo e-mail.
    if (!booking || booking.reviewRequestedAt) return;

    await enqueueNotification({
      kind: "REVIEW_REQUEST",
      bookingId,
      companyId: booking.companyId,
    });

    await db.notificationOutbox.updateMany({
      where: { bookingId, kind: "REVIEW_REQUEST", status: "PENDING" },
      data: {
        nextAttemptAt: new Date(Date.now() + REVIEW_REQUEST_DELAY_MINUTES * 60 * 1000),
      },
    });
  } catch (err) {
    // Falhar em agendar avaliação não pode derrubar a conclusão do atendimento.
    console.error("[review-request] falha ao enfileirar", bookingId, err);
  }
}
