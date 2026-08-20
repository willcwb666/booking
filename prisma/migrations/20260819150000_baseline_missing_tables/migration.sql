-- Reconciliacao do historico de migrations com o schema.
--
-- ─── O que estava quebrado ───────────────────────────────────────────────────
--
-- `prisma migrate deploy` contra um banco VAZIO nao funcionava. A cadeia
-- quebrava na migration 29 (20260819160000_customer_last_win_back):
--
--     ERROR: relation "customer" does not exist   (42P01)
--
-- Dez tabelas do schema — entre elas `customer`, `audit_log`, `company_role`,
-- `loyalty_program`, `loyalty_account`, `system_module`,
-- `company_module_license`, `system_notification`, `system_preset` e
-- `system_segment` — nunca foram criadas por migration nenhuma. E dezenas de
-- COLUNAS estavam na mesma situacao: `booking.customerId`,
-- `professional.commissionPercentage`, `company.brandColor`, `service.icon`,
-- `plan.isPopular`, entre outras.
--
-- A causa: em algum periodo o schema foi sincronizado com `prisma db push`, que
-- altera o banco sem gravar migration. O ambiente de desenvolvimento seguiu
-- funcionando — as tabelas estavam la — e o defeito ficou invisivel ate alguem
-- tentar subir do zero.
--
-- ─── Por que este carimbo de hora ────────────────────────────────────────────
--
-- Precisa vir depois de 20260819140000 (a ultima que aplica limpo) e antes de
-- 20260819160000 (a primeira que toca em `customer`). E o unico intervalo em
-- que a cadeia fecha.
--
-- ─── Por que tudo e idempotente ──────────────────────────────────────────────
--
-- Nos bancos que ja rodam, este conteudo ja existe. `IF NOT EXISTS`, guardas em
-- `pg_constraint` e `pg_class` fazem esta migration ser um no-op la, e a
-- criacao de verdade num banco novo. As migrations 29 em diante tambem sao
-- idempotentes, entao a sobreposicao com o que elas fazem e inofensiva.
--
-- Gerado por `prisma migrate diff` a partir do estado real da cadeia, nao
-- escrito a mao: o conteudo e exatamente o que faltava.

ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'NO_SHOW';

ALTER TYPE "BusinessType" ADD VALUE IF NOT EXISTS 'MECHANIC';

ALTER TABLE "schedule_event" DROP CONSTRAINT IF EXISTS "schedule_event_createdById_fkey";

ALTER TABLE "two_factor" DROP CONSTRAINT IF EXISTS "two_factor_userId_fkey";

ALTER TABLE "two_factor_reset_request" DROP CONSTRAINT IF EXISTS "two_factor_reset_request_requestedById_fkey";

ALTER TABLE "two_factor_reset_request" DROP CONSTRAINT IF EXISTS "two_factor_reset_request_targetUserId_fkey";

ALTER TABLE "booking" ADD COLUMN IF NOT EXISTS "customerId" TEXT,
ADD COLUMN IF NOT EXISTS "reviewRequestedAt" TIMESTAMP(3);

ALTER TABLE "booking_customer_detail" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "brandColor" TEXT DEFAULT '#0f172a',
ADD COLUMN IF NOT EXISTS "cancellationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "driveTimeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "driveTimeMaxMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN IF NOT EXISTS "driveTimeMinutesPerKm" DOUBLE PRECISION NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS "googleReviewUrl" TEXT,
ADD COLUMN IF NOT EXISTS "heroSubtitle" TEXT,
ADD COLUMN IF NOT EXISTS "heroTitle" TEXT,
ADD COLUMN IF NOT EXISTS "lateToleranceMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS "maxAllowedNoShows" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS "minCancellationNoticeHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN IF NOT EXISTS "notifyEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifySmsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "notifyTextEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyWhatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "photoRetentionMonths" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN IF NOT EXISTS "showTeamRanking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "socialFacebook" TEXT,
ADD COLUMN IF NOT EXISTS "socialInstagram" TEXT,
ADD COLUMN IF NOT EXISTS "socialWhatsapp" TEXT;

-- `businessType` e `tier` eram enums e viraram texto no schema. O `migrate diff`
-- expressa essa troca como DROP COLUMN + ADD COLUMN, que num banco COM DADOS
-- apagaria o ramo de todas as empresas e o plano de todos os assinantes. A
-- conversao de tipo faz a mesma mudanca preservando o conteudo, e e um no-op
-- onde a coluna ja e texto.
ALTER TABLE "company" ALTER COLUMN "businessType" TYPE TEXT USING "businessType"::TEXT;

ALTER TABLE "company_payment_settings" ADD COLUMN IF NOT EXISTS "depositPercentage" DOUBLE PRECISION NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS "requireDeposit" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "extra_service" ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT 'sparkles';

ALTER TABLE "notification_outbox" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "isPopular" BOOLEAN DEFAULT false;

ALTER TABLE "plan" ALTER COLUMN "tier" TYPE TEXT USING "tier"::TEXT;

ALTER TABLE "professional" ADD COLUMN IF NOT EXISTS "commissionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "dailyGoal" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "pixKey" TEXT,
ADD COLUMN IF NOT EXISTS "pixKeyType" TEXT,
ADD COLUMN IF NOT EXISTS "productCommissionRate" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "roleTitle" TEXT,
ADD COLUMN IF NOT EXISTS "servicesJson" TEXT,
ADD COLUMN IF NOT EXISTS "showOnLanding" BOOLEAN DEFAULT true;

ALTER TABLE "review" ADD COLUMN IF NOT EXISTS "alertSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'ACCOUNT';

ALTER TABLE "schedule_event" ALTER COLUMN "createdById" DROP NOT NULL;

ALTER TABLE "service" ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT 'scissors';

DROP TYPE IF EXISTS "PlanTier";

CREATE TABLE IF NOT EXISTS "user_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "aptNo" TEXT,
    "city" TEXT,
    "zip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "geocode_cache" (
    "query" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "provider" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geocode_cache_pkey" PRIMARY KEY ("query")
);

CREATE TABLE IF NOT EXISTS "customer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "notes" TEXT,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "completedBookings" INTEGER NOT NULL DEFAULT 0,
    "cancelledBookings" INTEGER NOT NULL DEFAULT 0,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastBookingDate" TEXT,
    "lastWinBackAt" TIMESTAMP(3),
    "acceptsMarketing" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "client_photo" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "professionalId" TEXT,
    "storageKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "caption" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "consentById" TEXT NOT NULL,
    "retainUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_photo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "service_record" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "professionalId" TEXT,
    "formula" TEXT,
    "developer" TEXT,
    "processingMinutes" INTEGER,
    "clipperGuard" TEXT,
    "productsUsed" TEXT,
    "notes" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_record_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "off_peak_window" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "discountPercentage" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "off_peak_window_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_preset" (
    "id" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "defaultPrice" DECIMAL(10,2) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "isExtra" BOOLEAN NOT NULL DEFAULT false,
    "parentTitle" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_preset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_segment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_segment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "loyalty_program" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerCurrency" DECIMAL(10,2) NOT NULL DEFAULT 1.0,
    "rewardThreshold" INTEGER NOT NULL DEFAULT 100,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 20.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_program_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "loyalty_account" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "recipientUserId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "payload" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_module" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Tag',
    "monthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lifetimePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "billingType" TEXT NOT NULL DEFAULT 'SUBSCRIPTION',
    "category" TEXT NOT NULL DEFAULT 'GROWTH',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_module_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "company_module_license" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "moduleCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT NOT NULL DEFAULT 'SYSTEM',

    CONSTRAINT "company_module_license_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "company_role" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_profile_userId_key" ON "user_profile"("userId");

CREATE INDEX IF NOT EXISTS "customer_companyId_idx" ON "customer"("companyId");

CREATE INDEX IF NOT EXISTS "customer_companyId_phone_idx" ON "customer"("companyId", "phone");

CREATE INDEX IF NOT EXISTS "customer_companyId_acceptsMarketing_idx" ON "customer"("companyId", "acceptsMarketing");

CREATE UNIQUE INDEX IF NOT EXISTS "customer_companyId_email_key" ON "customer"("companyId", "email");

CREATE UNIQUE INDEX IF NOT EXISTS "client_photo_storageKey_key" ON "client_photo"("storageKey");

CREATE INDEX IF NOT EXISTS "client_photo_companyId_customerId_idx" ON "client_photo"("companyId", "customerId");

CREATE INDEX IF NOT EXISTS "client_photo_retainUntil_idx" ON "client_photo"("retainUntil");

CREATE UNIQUE INDEX IF NOT EXISTS "service_record_bookingId_key" ON "service_record"("bookingId");

CREATE INDEX IF NOT EXISTS "service_record_companyId_customerId_idx" ON "service_record"("companyId", "customerId");

CREATE INDEX IF NOT EXISTS "service_record_companyId_professionalId_idx" ON "service_record"("companyId", "professionalId");

CREATE INDEX IF NOT EXISTS "off_peak_window_companyId_isActive_idx" ON "off_peak_window"("companyId", "isActive");

CREATE INDEX IF NOT EXISTS "off_peak_window_companyId_weekday_idx" ON "off_peak_window"("companyId", "weekday");

CREATE INDEX IF NOT EXISTS "system_preset_businessType_isActive_idx" ON "system_preset"("businessType", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "system_segment_code_key" ON "system_segment"("code");

CREATE INDEX IF NOT EXISTS "system_segment_isActive_idx" ON "system_segment"("isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_program_companyId_key" ON "loyalty_program"("companyId");

CREATE INDEX IF NOT EXISTS "loyalty_account_companyId_customerEmail_idx" ON "loyalty_account"("companyId", "customerEmail");

CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_account_companyId_customerEmail_key" ON "loyalty_account"("companyId", "customerEmail");

CREATE INDEX IF NOT EXISTS "audit_log_companyId_idx" ON "audit_log"("companyId");

CREATE INDEX IF NOT EXISTS "audit_log_userId_idx" ON "audit_log"("userId");

CREATE INDEX IF NOT EXISTS "system_notification_companyId_idx" ON "system_notification"("companyId");

CREATE INDEX IF NOT EXISTS "system_notification_recipientUserId_idx" ON "system_notification"("recipientUserId");

CREATE INDEX IF NOT EXISTS "system_notification_isRead_idx" ON "system_notification"("isRead");

CREATE UNIQUE INDEX IF NOT EXISTS "system_module_code_key" ON "system_module"("code");

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_company_module" ON "company_module_license"("companyId", "moduleCode");

CREATE INDEX IF NOT EXISTS "booking_companyId_customerId_idx" ON "booking"("companyId", "customerId");

CREATE UNIQUE INDEX IF NOT EXISTS "plan_tier_key" ON "plan"("tier");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profile_userId_fkey') THEN
    ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'two_factor_userId_fkey') THEN
    ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'two_factor_reset_request_targetUserId_fkey') THEN
    ALTER TABLE "two_factor_reset_request" ADD CONSTRAINT "two_factor_reset_request_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'two_factor_reset_request_requestedById_fkey') THEN
    ALTER TABLE "two_factor_reset_request" ADD CONSTRAINT "two_factor_reset_request_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schedule_event_createdById_fkey') THEN
    ALTER TABLE "schedule_event" ADD CONSTRAINT "schedule_event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_customerId_fkey') THEN
    ALTER TABLE "booking" ADD CONSTRAINT "booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_companyId_fkey') THEN
    ALTER TABLE "customer" ADD CONSTRAINT "customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
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

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_program_companyId_fkey') THEN
    ALTER TABLE "loyalty_program" ADD CONSTRAINT "loyalty_program_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_account_companyId_fkey') THEN
    ALTER TABLE "loyalty_account" ADD CONSTRAINT "loyalty_account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='two_factor_reset_status_after_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='two_factor_reset_request_status_executeAfter_idx') THEN
    ALTER INDEX "two_factor_reset_status_after_idx" RENAME TO "two_factor_reset_request_status_executeAfter_idx";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname='two_factor_reset_target_status_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname='two_factor_reset_request_targetUserId_status_idx') THEN
    ALTER INDEX "two_factor_reset_target_status_idx" RENAME TO "two_factor_reset_request_targetUserId_status_idx";
  END IF;
END $$;
