-- Duas tabelas que so existiam como DDL em tempo de execucao.
--
-- `company_payment_gateway` e `company_landing_config` nunca estiveram no
-- schema nem em migration nenhuma. Cada server action que as usava rodava um
-- `CREATE TABLE IF NOT EXISTS` antes de ler ou escrever — e no caso do
-- gateway de pagamento a LEITURA e publica, entao quem criava a tabela era o
-- primeiro visitante anonimo a abrir um checkout.
--
-- Consequencias, alem do DDL pegando lock a cada requisicao:
--
--   * invisiveis para `prisma migrate diff` — a analise de drift desta base
--     nunca as viu, porque nao existem no schema para serem comparadas;
--   * sem chave estrangeira: apagar a empresa deixava a linha orfa;
--   * sem tipo no client, so `$queryRawUnsafe` devolvendo `any`.
--
-- `IF NOT EXISTS` porque em qualquer ambiente onde alguem ja tenha aberto essas
-- telas a tabela existe, criada pelo caminho antigo.

CREATE TABLE IF NOT EXISTS "company_payment_gateway" (
    "companyId" TEXT NOT NULL,
    "autoDetectGeo" BOOLEAN NOT NULL DEFAULT true,
    "activeMethods" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "company_payment_gateway_pkey" PRIMARY KEY ("companyId")
);

CREATE TABLE IF NOT EXISTS "company_landing_config" (
    "companyId" TEXT NOT NULL,
    "heroTitle" TEXT NOT NULL,
    "heroSubtitle" TEXT NOT NULL,
    "bannerUrl" TEXT NOT NULL DEFAULT '',
    "accentColor" TEXT NOT NULL DEFAULT '#635bff',
    "featuredServiceIds" TEXT NOT NULL DEFAULT '[]',
    "showTestimonials" BOOLEAN NOT NULL DEFAULT true,
    "customWelcomeMessage" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "company_landing_config_pkey" PRIMARY KEY ("companyId")
);

-- A chave estrangeira e a parte que o caminho antigo nao tinha como dar: a
-- tabela nascia solta, e empresa apagada deixava configuracao orfa para
-- sempre. `NOT VALID` nao serve aqui porque queremos que linhas orfas
-- existentes (se houver) apareçam agora, e nao daqui a um ano.
DO $$
BEGIN
  DELETE FROM "company_payment_gateway"
   WHERE "companyId" NOT IN (SELECT "id" FROM "company");
  DELETE FROM "company_landing_config"
   WHERE "companyId" NOT IN (SELECT "id" FROM "company");
END $$;

ALTER TABLE "company_payment_gateway"
  DROP CONSTRAINT IF EXISTS "company_payment_gateway_companyId_fkey";
ALTER TABLE "company_payment_gateway"
  ADD CONSTRAINT "company_payment_gateway_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_landing_config"
  DROP CONSTRAINT IF EXISTS "company_landing_config_companyId_fkey";
ALTER TABLE "company_landing_config"
  ADD CONSTRAINT "company_landing_config_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
