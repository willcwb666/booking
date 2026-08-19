-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Política de sessão: origem (web/mobile) + último acesso
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "client" TEXT NOT NULL DEFAULT 'WEB';
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Sessões pré-existentes: assume o instante da última atualização como
-- atividade, para não deslogar todo mundo na primeira requisição após o deploy.
UPDATE "session" SET "lastActivityAt" = "updatedAt" WHERE "lastActivityAt" < "updatedAt";

CREATE INDEX IF NOT EXISTS "session_userId_client_idx" ON "session"("userId", "client");

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. system_setting vira model versionado (a tabela já pode existir por ter
--    sido criada em runtime via CREATE TABLE IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "system_setting" (
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "system_setting_pkey" PRIMARY KEY ("key")
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. booking_slot: trava de duplo agendamento POR PROFISSIONAL
--    A constraint antiga [agendaId, date, startTime] impedia que dois
--    profissionais da mesma agenda vendessem o mesmo horário.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "booking_slot" ADD COLUMN IF NOT EXISTS "professionalId" TEXT NOT NULL DEFAULT '';

-- Backfill a partir do agendamento dono do slot (NULL → '' para manter a
-- semântica "recurso único" e permitir o índice único).
UPDATE "booking_slot" bs
SET "professionalId" = COALESCE(b."professionalId", '')
FROM "booking" b
WHERE b."id" = bs."bookingId" AND bs."professionalId" = '';

DROP INDEX IF EXISTS "booking_slot_agendaId_date_startTime_key";

CREATE UNIQUE INDEX IF NOT EXISTS "booking_slot_agendaId_date_startTime_professionalId_key"
  ON "booking_slot"("agendaId", "date", "startTime", "professionalId");
