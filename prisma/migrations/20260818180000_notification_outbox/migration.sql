-- Fila de saída de notificações.
-- Substitui o padrão `void notify…(id)` (dispara e esquece, sem retry e sem
-- registro) por uma intenção persistida que um worker consome com backoff.
CREATE TABLE IF NOT EXISTS "notification_outbox" (
  "id"            TEXT NOT NULL,
  "kind"          TEXT NOT NULL,
  "bookingId"     TEXT,
  "companyId"     TEXT,
  "payload"       TEXT,
  "status"        TEXT NOT NULL DEFAULT 'PENDING',
  "attempts"      INTEGER NOT NULL DEFAULT 0,
  "lastError"     TEXT,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"        TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- Índice do worker: "o que está pendente e já pode ser tentado"
CREATE INDEX IF NOT EXISTS "notification_outbox_status_nextAttemptAt_idx"
  ON "notification_outbox"("status", "nextAttemptAt");

CREATE INDEX IF NOT EXISTS "notification_outbox_bookingId_idx"
  ON "notification_outbox"("bookingId");
