-- Cofre do cliente: fotos de antes/depois e ficha tecnica do atendimento.
--
-- Rosto de pessoa identificada e dado pessoal sensivel nas duas jurisdicoes em
-- que o produto opera. Tres consequencias estao no desenho, nao em politica
-- escrita em outro lugar:
--
--   1. guarda-se a CHAVE do objeto, nunca uma URL publica. A leitura passa por
--      URL assinada de vida curta. URL publica com nome aleatorio e segredo por
--      obscuridade: basta vazar num print ou num log para valer para sempre;
--   2. consentimento por foto, com data e com quem colheu. Consentimento sem
--      registro e o mesmo que nenhum;
--   3. prazo de guarda obrigatorio (retainUntil). Sem prazo, o acervo de dado
--      sensivel cresce para sempre.
--
-- Nao existe campo de "autorizacao para uso publico" e nao existe galeria
-- publica. A forma de garantir que uma foto dessas nunca apareca numa landing
-- page e nao construir o caminho ate la.

ALTER TABLE "company"
  ADD COLUMN IF NOT EXISTS "photoRetentionMonths" INTEGER NOT NULL DEFAULT 24;

CREATE TABLE IF NOT EXISTS "client_photo" (
  "id"             TEXT PRIMARY KEY,
  "companyId"      TEXT NOT NULL REFERENCES "company"("id") ON DELETE CASCADE,
  "customerId"     TEXT NOT NULL REFERENCES "customer"("id") ON DELETE CASCADE,
  "bookingId"      TEXT REFERENCES "booking"("id") ON DELETE SET NULL,
  "professionalId" TEXT REFERENCES "professional"("id") ON DELETE SET NULL,
  "storageKey"     TEXT NOT NULL UNIQUE,
  "kind"           TEXT NOT NULL,
  "caption"        TEXT,
  "consentAt"      TIMESTAMP(3) NOT NULL,
  "consentById"    TEXT NOT NULL REFERENCES "user"("id"),
  "retainUntil"    TIMESTAMP(3) NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "client_photo_company_customer_idx"
  ON "client_photo" ("companyId", "customerId");
-- O expurgo varre por prazo vencido: sem este indice ele percorreria o acervo
-- inteiro a cada passada do cron.
CREATE INDEX IF NOT EXISTS "client_photo_retain_until_idx"
  ON "client_photo" ("retainUntil");

CREATE TABLE IF NOT EXISTS "service_record" (
  "id"                TEXT PRIMARY KEY,
  "companyId"         TEXT NOT NULL REFERENCES "company"("id") ON DELETE CASCADE,
  "customerId"        TEXT NOT NULL REFERENCES "customer"("id") ON DELETE CASCADE,
  -- Um registro por atendimento. Dois seriam duas verdades sobre a mesma
  -- sessao, e no retorno ninguem saberia qual das duas foi aplicada.
  "bookingId"         TEXT UNIQUE REFERENCES "booking"("id") ON DELETE SET NULL,
  "professionalId"    TEXT REFERENCES "professional"("id") ON DELETE SET NULL,
  "formula"           TEXT,
  "developer"         TEXT,
  "processingMinutes" INTEGER,
  "clipperGuard"      TEXT,
  "productsUsed"      TEXT,
  "notes"             TEXT,
  "performedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "service_record_company_customer_idx"
  ON "service_record" ("companyId", "customerId");
-- O autocomplete busca o que AQUELE profissional ja usou antes.
CREATE INDEX IF NOT EXISTS "service_record_company_professional_idx"
  ON "service_record" ("companyId", "professionalId");
