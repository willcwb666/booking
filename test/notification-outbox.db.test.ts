import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { db } from "@/lib/db";

/**
 * Integração do outbox de notificações contra o Postgres de desenvolvimento.
 * Roda com `RUN_DB_TESTS=1`.
 *
 * O envio real é mockado: aqui interessa a MECÂNICA da fila (reserva, retry
 * com backoff, esgotamento), não o conteúdo do e-mail.
 */
const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

const sendMock = vi.fn();

vi.mock("@/lib/notifications", () => ({
  notifyBookingConfirmed: (id: string) => sendMock(id),
  notifyBookingCancelled: (id: string) => sendMock(id),
  notifyBookingReminder: (id: string) => sendMock(id),
  notifyCompanyNewBooking: (id: string) => sendMock(id),
  notifyStatusChanged: (id: string) => sendMock(id),
  notifyBookingCompletedWithInvoice: (id: string) => sendMock(id),
}));

const BOOKING_ID = "vitest-outbox-booking";

async function cleanup() {
  await db.notificationOutbox.deleteMany({ where: { bookingId: BOOKING_ID } });
}

d("outbox de notificações (integração)", () => {
  beforeEach(async () => {
    sendMock.mockReset();
    sendMock.mockResolvedValue(undefined);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  it("entrega e marca como SENT", async () => {
    const { enqueueNotification, processOutbox } = await import("@/lib/notification-outbox");

    await enqueueNotification({ kind: "BOOKING_CONFIRMED", bookingId: BOOKING_ID });
    const res = await processOutbox(10);

    expect(res.sent).toBeGreaterThanOrEqual(1);
    expect(sendMock).toHaveBeenCalledWith(BOOKING_ID);

    const row = await db.notificationOutbox.findFirstOrThrow({
      where: { bookingId: BOOKING_ID },
    });
    expect(row.status).toBe("SENT");
    expect(row.sentAt).not.toBeNull();
  });

  it("falha volta para PENDING com backoff no futuro, sem perder a notificação", async () => {
    const { enqueueNotification, processOutbox } = await import("@/lib/notification-outbox");
    sendMock.mockRejectedValue(new Error("provedor fora do ar"));

    await enqueueNotification({ kind: "BOOKING_CONFIRMED", bookingId: BOOKING_ID });
    const res = await processOutbox(10);

    expect(res.failed).toBe(1);
    expect(res.sent).toBe(0);

    const row = await db.notificationOutbox.findFirstOrThrow({
      where: { bookingId: BOOKING_ID },
    });
    // O ponto principal: a notificação continua na fila, não sumiu.
    expect(row.status).toBe("PENDING");
    expect(row.attempts).toBe(1);
    expect(row.lastError).toContain("provedor fora do ar");
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("não reprocessa quem ainda está no backoff", async () => {
    const { enqueueNotification, processOutbox } = await import("@/lib/notification-outbox");
    sendMock.mockRejectedValue(new Error("falhou"));

    await enqueueNotification({ kind: "BOOKING_CONFIRMED", bookingId: BOOKING_ID });
    await processOutbox(10);
    sendMock.mockReset();
    sendMock.mockResolvedValue(undefined);

    // Segunda passada imediata: a linha ainda não venceu o backoff
    const res = await processOutbox(10);
    expect(res.claimed).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("marca FAILED depois de esgotar as tentativas", async () => {
    const { enqueueNotification, processOutbox } = await import("@/lib/notification-outbox");
    sendMock.mockRejectedValue(new Error("erro permanente"));

    await enqueueNotification({ kind: "BOOKING_CONFIRMED", bookingId: BOOKING_ID });

    // 5 tentativas configuradas; força o vencimento do backoff a cada rodada
    for (let i = 0; i < 6; i++) {
      await db.notificationOutbox.updateMany({
        where: { bookingId: BOOKING_ID, status: "PENDING" },
        data: { nextAttemptAt: new Date(Date.now() - 1000) },
      });
      await processOutbox(10);
    }

    const row = await db.notificationOutbox.findFirstOrThrow({
      where: { bookingId: BOOKING_ID },
    });
    expect(row.status).toBe("FAILED");
    // Fica visível para investigação em vez de sumir silenciosamente
    expect(row.lastError).toContain("erro permanente");
  });
});
