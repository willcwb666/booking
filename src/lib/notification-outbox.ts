import "server-only";
import { db } from "@/lib/db";
import {
  notifyBookingCancelled,
  notifyBookingCompletedWithInvoice,
  notifyBookingConfirmed,
  notifyBookingReminder,
  notifyCompanyNewBooking,
  notifyReviewRequest,
  notifyStatusChanged,
} from "@/lib/notifications";

/**
 * Fila de saída de notificações.
 *
 * O padrão antigo era `void notifyBookingConfirmed(id)` — dispara e esquece.
 * Três problemas, todos silenciosos:
 *   · o provedor de e-mail cai e a confirmação some sem deixar rastro;
 *   · em runtime serverless o processo pode encerrar antes da promise;
 *   · não havia como responder "o cliente recebeu?".
 *
 * Aqui a INTENÇÃO de notificar é gravada (idealmente na mesma transação do
 * agendamento) e um worker entrega depois, com nova tentativa em caso de erro.
 */

export type NotificationKind =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_REMINDER"
  | "COMPANY_NEW_BOOKING"
  | "STATUS_CHANGED"
  | "BOOKING_COMPLETED_INVOICE"
  | "REVIEW_REQUEST";

/** Espera DEPOIS da tentativa N que falhou: 1min, 5min, 15min, 1h, 6h. */
const BACKOFF_MINUTES = [1, 5, 15, 60, 360];

/**
 * Tentativas antes de desistir.
 *
 * Sao as cinco esperas acima mais a tentativa que vem depois da ultima: seis.
 * Era `BACKOFF_MINUTES.length`, e com o indice tambem errado por um o
 * resultado era outro: a primeira reentrega esperava 5 minutos em vez de 1, e
 * as esperas de 1min e de 6h nunca eram usadas.
 */
const MAX_ATTEMPTS = BACKOFF_MINUTES.length + 1;

/**
 * Depois de quanto tempo uma linha em SENDING e considerada abandonada.
 *
 * `attempts` e incrementado na reserva, entao a linha vira SENDING antes do
 * envio. Se o processo morre no meio — deploy, timeout de funcao serverless,
 * OOM — a linha fica SENDING para sempre: `processOutbox` so procura PENDING,
 * e ninguem mais olha para ela. A notificacao some sem erro e sem rastro, e o
 * proprio schema documenta os status como "PENDING | SENT | FAILED", sinal de
 * que SENDING nunca foi pensado como estado em que se pode ficar preso.
 *
 * Quinze minutos e folgado para um envio de e-mail. O risco do resgate e
 * mandar duas vezes se o worker original estava so lento; o risco de nao
 * resgatar e nao mandar nunca. Entre um incomodo possivel e uma perda certa,
 * escolhe-se o incomodo.
 */
const STALE_SENDING_MINUTES = 15;

type EnqueueInput = {
  kind: NotificationKind;
  bookingId?: string | null;
  companyId?: string | null;
  payload?: Record<string, unknown>;
  /** Cliente de transação Prisma, para gravar junto com a operação de origem. */
  tx?: {
    notificationOutbox: {
      create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    };
  };
};

/**
 * Enfileira uma notificação.
 *
 * Passe `tx` sempre que houver uma transação em curso: assim ou o agendamento
 * e a notificação existem juntos, ou nenhum dos dois. Enfileirar fora da
 * transação reabre a janela de "agendamento salvo, cliente não avisado".
 */
export async function enqueueNotification(input: EnqueueInput): Promise<void> {
  const data = {
    kind: input.kind,
    bookingId: input.bookingId ?? null,
    companyId: input.companyId ?? null,
    payload: input.payload ? JSON.stringify(input.payload) : null,
  };

  try {
    if (input.tx) {
      await input.tx.notificationOutbox.create({ data });
      return;
    }
    await db.notificationOutbox.create({ data });
  } catch (err) {
    // Falhar ao enfileirar não pode derrubar o agendamento em si.
    console.error("[outbox] falha ao enfileirar", input.kind, err);
  }
}

async function dispatch(row: {
  kind: string;
  bookingId: string | null;
  payload: string | null;
}): Promise<void> {
  const payload = row.payload
    ? (JSON.parse(row.payload) as Record<string, unknown>)
    : {};

  if (!row.bookingId) throw new Error("Notificação sem bookingId");

  switch (row.kind) {
    case "BOOKING_CONFIRMED":
      await notifyBookingConfirmed(row.bookingId);
      return;
    case "BOOKING_CANCELLED":
      await notifyBookingCancelled(row.bookingId);
      return;
    case "BOOKING_REMINDER":
      await notifyBookingReminder(row.bookingId);
      return;
    case "COMPANY_NEW_BOOKING":
      await notifyCompanyNewBooking(row.bookingId);
      return;
    case "STATUS_CHANGED":
      await notifyStatusChanged(row.bookingId, String(payload.newStatus ?? ""));
      return;
    case "BOOKING_COMPLETED_INVOICE":
      await notifyBookingCompletedWithInvoice(
        row.bookingId,
        Number(payload.basePrice ?? 0),
        (payload.additionalItems as Array<{ description: string; amount: number }>) ?? [],
        Number(payload.discountAmount ?? 0),
        Number(payload.finalTotal ?? 0)
      );
      return;
    case "REVIEW_REQUEST":
      await notifyReviewRequest(row.bookingId);
      return;
    default:
      throw new Error(`Tipo de notificação desconhecido: ${row.kind}`);
  }
}

export type OutboxRunResult = {
  claimed: number;
  sent: number;
  failed: number;
  exhausted: number;
  /** Linhas devolvidas de SENDING para PENDING por abandono. */
  rescued: number;
};

/**
 * Processa um lote da fila.
 *
 * A "reserva" é feita marcando as linhas como SENDING numa escrita
 * condicional: se dois workers rodarem ao mesmo tempo, só um leva cada linha e
 * ninguém envia o mesmo e-mail duas vezes.
 */
export async function processOutbox(limit = 25): Promise<OutboxRunResult> {
  const now = new Date();

  // Resgata o que ficou preso em SENDING — ver `STALE_SENDING_MINUTES`.
  const rescued = await db.notificationOutbox.updateMany({
    where: {
      status: "SENDING",
      updatedAt: { lt: new Date(now.getTime() - STALE_SENDING_MINUTES * 60_000) },
    },
    data: { status: "PENDING", nextAttemptAt: now },
  });
  if (rescued.count > 0) {
    console.warn("[outbox] resgatadas do estado SENDING:", rescued.count);
  }

  const candidates = await db.notificationOutbox.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const result: OutboxRunResult = {
    claimed: 0,
    sent: 0,
    failed: 0,
    exhausted: 0,
    rescued: rescued.count,
  };

  for (const { id } of candidates) {
    // Reserva atômica: só processa quem conseguiu virar a linha de PENDING
    // para SENDING. `count === 0` significa que outro worker pegou primeiro.
    const claim = await db.notificationOutbox.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "SENDING", attempts: { increment: 1 } },
    });
    if (claim.count === 0) continue;
    result.claimed++;

    const row = await db.notificationOutbox.findUnique({ where: { id } });
    if (!row) continue;

    try {
      await dispatch(row);
      await db.notificationOutbox.update({
        where: { id },
        data: { status: "SENT", sentAt: new Date(), lastError: null },
      });
      result.sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const exhausted = row.attempts >= MAX_ATTEMPTS;

      await db.notificationOutbox.update({
        where: { id },
        data: exhausted
          ? { status: "FAILED", lastError: message }
          : {
              status: "PENDING",
              lastError: message,
              // `attempts` ja foi incrementado na reserva: a primeira falha
              // chega aqui com 1, e a primeira espera e a de indice 0.
              nextAttemptAt: new Date(
                Date.now() +
                  BACKOFF_MINUTES[
                    Math.min(row.attempts - 1, BACKOFF_MINUTES.length - 1)
                  ] * 60_000
              ),
            },
      });

      if (exhausted) {
        result.exhausted++;
        console.error("[outbox] esgotou tentativas", row.kind, row.bookingId, message);
      } else {
        result.failed++;
      }
    }
  }

  return result;
}
