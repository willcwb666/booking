-- Alinha o banco EXISTENTE com o schema.
--
-- A cadeia de migrations ja replicava limpa num banco vazio - isso foi provado
-- na reconciliacao de 20260819150000. O que sobrava era o inverso: o banco que
-- JA RODA nao batia com o schema, porque as migrations escritas a mao (drive
-- time, cofre do cliente, perfil, metas) criaram chaves estrangeiras com nome
-- automatico e deram DEFAULT ao `updatedAt`.
--
-- Nada disso quebrava nada. O risco era o proximo `prisma migrate dev` gerar
-- uma migration corretiva com conteudo que ninguem pediu, e alguem aplica-la
-- sem ler.
--
-- ─── A coluna que NAO foi apagada ────────────────────────────────────────────
--
-- O diff pedia DROP COLUMN em "system_notification"."senderUserId".
-- Nao foi feito: a coluna e ESCRITA por `broadcast-updates.ts`. Quem estava
-- errado era o schema, que nao a declarava - apagar para "alinhar" teria
-- quebrado quem escreve nela. O campo entrou no schema, e o diff parou de pedir
-- a exclusao.
--
-- Idempotente: `DROP CONSTRAINT IF EXISTS` e guarda em `pg_constraint`. Num
-- banco novo, onde as constraints ja nascem com o nome canonico, e no-op.

-- No banco de desenvolvimento a coluna ja existia (nasceu do CREATE TABLE em
-- runtime de `broadcast-updates.ts`), entao o diff nao pediu a criacao dela.
-- Num banco NOVO ela nao existe: a tabela nasce da migration de reconciliacao,
-- gerada a partir do schema de ANTES deste ajuste.
ALTER TABLE "system_notification"
  ADD COLUMN IF NOT EXISTS "senderUserId" TEXT;

ALTER TABLE "client_photo" DROP CONSTRAINT IF EXISTS "client_photo_bookingId_fkey";

ALTER TABLE "client_photo" DROP CONSTRAINT IF EXISTS "client_photo_companyId_fkey";

ALTER TABLE "client_photo" DROP CONSTRAINT IF EXISTS "client_photo_consentById_fkey";

ALTER TABLE "client_photo" DROP CONSTRAINT IF EXISTS "client_photo_customerId_fkey";

ALTER TABLE "client_photo" DROP CONSTRAINT IF EXISTS "client_photo_professionalId_fkey";

ALTER TABLE "off_peak_window" DROP CONSTRAINT IF EXISTS "off_peak_window_companyId_fkey";

ALTER TABLE "service_record" DROP CONSTRAINT IF EXISTS "service_record_bookingId_fkey";

ALTER TABLE "service_record" DROP CONSTRAINT IF EXISTS "service_record_companyId_fkey";

ALTER TABLE "service_record" DROP CONSTRAINT IF EXISTS "service_record_customerId_fkey";

ALTER TABLE "service_record" DROP CONSTRAINT IF EXISTS "service_record_professionalId_fkey";

ALTER TABLE "user_profile" DROP CONSTRAINT IF EXISTS "user_profile_userId_fkey";

ALTER TABLE "off_peak_window" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "service_record" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "user_profile" ALTER COLUMN "updatedAt" DROP DEFAULT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profile_userId_fkey') THEN
    ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_photo_companyId_fkey') THEN
    ALTER TABLE "client_photo" ADD CONSTRAINT "client_photo_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_photo_customerId_fkey') THEN
    ALTER TABLE "client_photo" ADD CONSTRAINT "client_photo_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_photo_bookingId_fkey') THEN
    ALTER TABLE "client_photo" ADD CONSTRAINT "client_photo_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_photo_professionalId_fkey') THEN
    ALTER TABLE "client_photo" ADD CONSTRAINT "client_photo_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_photo_consentById_fkey') THEN
    ALTER TABLE "client_photo" ADD CONSTRAINT "client_photo_consentById_fkey" FOREIGN KEY ("consentById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_record_companyId_fkey') THEN
    ALTER TABLE "service_record" ADD CONSTRAINT "service_record_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_record_customerId_fkey') THEN
    ALTER TABLE "service_record" ADD CONSTRAINT "service_record_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_record_bookingId_fkey') THEN
    ALTER TABLE "service_record" ADD CONSTRAINT "service_record_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_record_professionalId_fkey') THEN
    ALTER TABLE "service_record" ADD CONSTRAINT "service_record_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'off_peak_window_companyId_fkey') THEN
    ALTER TABLE "off_peak_window" ADD CONSTRAINT "off_peak_window_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
