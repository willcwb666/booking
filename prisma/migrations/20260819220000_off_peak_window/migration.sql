-- Janela de horário ocioso com desconto ("Happy Hour").
--
-- Metade do yield management do roadmap. O acréscimo de preço no pico NÃO foi
-- construído e não deve ser: a Uber cobra mais no pico porque a relação é
-- anônima e descartável; barbearia é o oposto, e o cliente que descobre ter
-- pago mais que o vizinho pelo mesmo corte não reclama do preço, some.
--
-- Desconto produz o mesmo efeito de ocupação sem esse risco, porque é lido
-- como presente e não como punição.
--
-- Complementa `ghost-slot-buster`, que cobre a vaga que abriu agora. Aqui é o
-- horário que está sempre vazio, toda semana.

CREATE TABLE IF NOT EXISTS "off_peak_window" (
  "id"                 TEXT PRIMARY KEY,
  "companyId"          TEXT NOT NULL REFERENCES "company"("id") ON DELETE CASCADE,
  "label"              TEXT NOT NULL,
  "weekday"            INTEGER NOT NULL,
  "startTime"          TEXT NOT NULL,
  "endTime"            TEXT NOT NULL,
  "discountPercentage" DOUBLE PRECISION NOT NULL,
  "isActive"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "off_peak_window_company_active_idx"
  ON "off_peak_window" ("companyId", "isActive");
CREATE INDEX IF NOT EXISTS "off_peak_window_company_weekday_idx"
  ON "off_peak_window" ("companyId", "weekday");
