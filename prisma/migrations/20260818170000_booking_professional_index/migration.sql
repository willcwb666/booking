-- Agenda individual do profissional e relatório de comissão filtram por
-- profissional + data. Sem este índice o Postgres usava o índice de agenda e
-- descartava o resto em memória.
CREATE INDEX IF NOT EXISTS "booking_professionalId_scheduledDate_idx"
  ON "booking"("professionalId", "scheduledDate");
