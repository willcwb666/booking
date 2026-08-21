import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * A fila de notificações sob falha, contra o Postgres real.
 *
 * ─── Os três defeitos que este arquivo fixa ──────────────────────────────────
 *
 * 1. Linha presa em SENDING para sempre.
 *
 *    `attempts` é incrementado na RESERVA, então a linha vira SENDING antes do
 *    envio. Se o processo morre no meio — deploy, timeout de função
 *    serverless, OOM — ela fica SENDING: `processOutbox` só procura PENDING, e
 *    ninguém mais olha. A notificação some sem erro e sem rastro. O próprio
 *    schema documenta os status como "PENDING | SENT | FAILED", sinal de que
 *    esse estado nunca foi pensado como um em que se pode ficar preso.
 *
 * 2. Espera errada entre tentativas.
 *
 *    `BACKOFF_MINUTES[Math.min(row.attempts, MAX_ATTEMPTS - 1)]` com
 *    `attempts` já incrementado dava índice 1 na primeira falha: a reentrega
 *    mais rápida — a que existe para cobrir uma queda de segundos do provedor
 *    — esperava 5 minutos em vez de 1. E `MAX_ATTEMPTS = BACKOFF.length` fazia
 *    a última espera (6h) nunca ser usada.
 *
 * 3. Consequência do item 2: eram 5 tentativas, não 6.
 */

const enabled = process.env.RUN_DB_TESTS === "1";
const d = enabled ? describe : describe.skip;

/** Falha controlada: o despacho quebra enquanto isto for verdade. */
let deveFalhar = true;

vi.mock("@/lib/notifications", () => {
  const boom = async () => {
    if (deveFalhar) throw new Error("provedor fora do ar");
  };
  return {
    notifyBookingConfirmed: boom,
    notifyBookingCancelled: boom,
    notifyBookingReminder: boom,
    notifyCompanyNewBooking: boom,
    notifyStatusChanged: boom,
    notifyBookingCompletedWithInvoice: boom,
    notifyReviewRequest: boom,
  };
});

const P = "vitest-outbox-res";

let db: typeof import("@/lib/db").db;
let processOutbox: typeof import("@/lib/notification-outbox").processOutbox;

async function cleanup() {
  await db.notificationOutbox.deleteMany({ where: { bookingId: { startsWith: P } } });
}

/** Uma linha na fila, pronta para ser processada. */
async function enfileira(bookingId: string) {
  return db.notificationOutbox.create({
    data: { kind: "BOOKING_CONFIRMED", bookingId, status: "PENDING" },
  });
}

d("resiliência da fila de notificações (integração)", () => {
  beforeAll(async () => {
    ({ db } = await import("@/lib/db"));
    ({ processOutbox } = await import("@/lib/notification-outbox"));
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  afterEach(async () => {
    // Limpeza no afterEach: no fim do `it` ela não roda quando o caso falha, e
    // o resíduo contamina a execução seguinte da suíte inteira.
    deveFalhar = true;
    await cleanup();
  });

  it("resgata linha abandonada em SENDING", async () => {
    // Simula o worker que morreu depois de reservar: SENDING, e `updatedAt`
    // antigo o bastante para não ser confundido com um envio em curso.
    const row = await enfileira(`${P}-preso`);
    await db.$executeRawUnsafe(
      `UPDATE "notification_outbox" SET status = 'SENDING', attempts = 1, "updatedAt" = NOW() - INTERVAL '30 minutes' WHERE id = $1`,
      row.id
    );

    deveFalhar = false;
    const res = await processOutbox(50);

    expect(res.rescued).toBeGreaterThanOrEqual(1);
    const depois = await db.notificationOutbox.findUniqueOrThrow({ where: { id: row.id } });
    expect(depois.status).toBe("SENT");
  });

  it("NÃO resgata linha que acabou de ser reservada", async () => {
    // O outro lado: um envio em curso não pode ser roubado, senão o resgate
    // vira a causa dos e-mails duplicados que deveria evitar.
    const row = await enfileira(`${P}-emcurso`);
    await db.$executeRawUnsafe(
      `UPDATE "notification_outbox" SET status = 'SENDING', attempts = 1 WHERE id = $1`,
      row.id
    );

    await processOutbox(50);

    const depois = await db.notificationOutbox.findUniqueOrThrow({ where: { id: row.id } });
    expect(depois.status).toBe("SENDING");
  });

  it("a primeira reentrega espera 1 minuto, não 5", async () => {
    const row = await enfileira(`${P}-backoff`);
    const antes = Date.now();

    await processOutbox(50);

    const depois = await db.notificationOutbox.findUniqueOrThrow({ where: { id: row.id } });
    expect(depois.status).toBe("PENDING");
    expect(depois.attempts).toBe(1);

    const esperaMin = (depois.nextAttemptAt.getTime() - antes) / 60_000;
    // Folga para o tempo de execução do próprio teste.
    expect(esperaMin).toBeGreaterThan(0.5);
    expect(esperaMin).toBeLessThan(3);
  });

  it("desiste depois de seis tentativas, não cinco", async () => {
    const row = await enfileira(`${P}-esgota`);

    // Roda o ciclo inteiro, zerando a espera entre uma tentativa e outra para
    // não depender de tempo real.
    for (let i = 0; i < 6; i++) {
      await db.$executeRawUnsafe(
        `UPDATE "notification_outbox" SET "nextAttemptAt" = NOW() - INTERVAL '1 minute' WHERE id = $1 AND status = 'PENDING'`,
        row.id
      );
      await processOutbox(50);
    }

    const depois = await db.notificationOutbox.findUniqueOrThrow({ where: { id: row.id } });
    expect(depois.attempts).toBe(6);
    expect(depois.status).toBe("FAILED");
    expect(depois.lastError).toContain("provedor fora do ar");
  });

  it("entrega com sucesso marca SENT e limpa o erro anterior", async () => {
    // Controle positivo: sem ele, os casos acima passariam mesmo com a fila
    // incapaz de entregar qualquer coisa.
    const row = await enfileira(`${P}-ok`);
    deveFalhar = false;

    const res = await processOutbox(50);

    expect(res.sent).toBeGreaterThanOrEqual(1);
    const depois = await db.notificationOutbox.findUniqueOrThrow({ where: { id: row.id } });
    expect(depois.status).toBe("SENT");
    expect(depois.sentAt).not.toBeNull();
    expect(depois.lastError).toBeNull();
  });
});
