-- Buffer de deslocamento entre atendimentos a domicilio.
--
-- Desligado por padrao. Para quem atende no balcao, reservar tempo de viagem
-- so apagaria horarios vendaveis da grade; a empresa que atende na casa do
-- cliente liga explicitamente.
ALTER TABLE "company"
  ADD COLUMN IF NOT EXISTS "driveTimeEnabled"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "driveTimeMinutesPerKm" DOUBLE PRECISION NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "driveTimeMaxMinutes"   INTEGER NOT NULL DEFAULT 120;

-- Coordenadas do endereco do atendimento, resolvidas uma vez na criacao.
-- Nulas quando nao houve geocodificacao — e ai o atendimento nao gera bloqueio.
ALTER TABLE "booking_customer_detail"
  ADD COLUMN IF NOT EXISTS "latitude"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- O bloqueio de deslocamento nao tem autor: ninguem o criou. Carimbar o dono
-- da empresa como criador de um bloco gerado pelo sistema seria mentira no
-- rastro de auditoria.
ALTER TABLE "schedule_event" ALTER COLUMN "createdById" DROP NOT NULL;

-- Endereco ja resolvido em coordenadas. O geocodificador e um servico publico
-- mantido por voluntarios: reconsultar o mesmo endereco a cada agendamento de
-- um cliente recorrente desperdica a cota de todo mundo. Falha tambem entra no
-- cache, com coordenadas nulas, para nao ser reconsultada para sempre.
CREATE TABLE IF NOT EXISTS "geocode_cache" (
  "query"      TEXT PRIMARY KEY,
  "latitude"   DOUBLE PRECISION,
  "longitude"  DOUBLE PRECISION,
  "provider"   TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
