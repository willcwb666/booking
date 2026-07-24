-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('STRIPE_CARD', 'MERCADOPAGO_PIX', 'MANUAL');

-- AlterTable
ALTER TABLE "booking" ADD COLUMN     "companyPaymentMethodId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentConfirmedById" TEXT;

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'BRL',
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'pt-BR',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- CreateTable
CREATE TABLE "company_payment_method" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "label" TEXT NOT NULL,
    "handle" TEXT,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_payment_method_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_payment_method_companyId_isActive_idx" ON "company_payment_method"("companyId", "isActive");

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_companyPaymentMethodId_fkey" FOREIGN KEY ("companyPaymentMethodId") REFERENCES "company_payment_method"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_paymentConfirmedById_fkey" FOREIGN KEY ("paymentConfirmedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_payment_method" ADD CONSTRAINT "company_payment_method_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Backfill: migra CompanyPaymentSettings → CompanyPaymentMethod ───────────
-- Espelha o comportamento atual do checkout: sem settings, cartão e
-- dinheiro/cheque ficam habilitados e PIX desabilitado.

-- Cartão (Stripe) para toda empresa
INSERT INTO "company_payment_method" ("id", "companyId", "kind", "label", "isActive", "displayOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c."id", 'STRIPE_CARD'::"PaymentKind", 'Cartão de crédito/débito',
       COALESCE(s."enableCard", true), 0, NOW(), NOW()
FROM "company" c
LEFT JOIN "company_payment_settings" s ON s."companyId" = c."id";

-- Dinheiro/Cheque (manual) para toda empresa
INSERT INTO "company_payment_method" ("id", "companyId", "kind", "label", "isActive", "displayOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c."id", 'MANUAL'::"PaymentKind", 'Dinheiro/Cheque',
       COALESCE(s."enableCashCheck", true), 10, NOW(), NOW()
FROM "company" c
LEFT JOIN "company_payment_settings" s ON s."companyId" = c."id";

-- PIX automático (Mercado Pago) quando há token configurado
INSERT INTO "company_payment_method" ("id", "companyId", "kind", "label", "isActive", "displayOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s."companyId", 'MERCADOPAGO_PIX'::"PaymentKind", 'PIX',
       s."enablePix", 5, NOW(), NOW()
FROM "company_payment_settings" s
WHERE s."mercadoPagoAccessToken" IS NOT NULL;

-- PIX por chave estática (manual) quando há chave mas não há token MP
INSERT INTO "company_payment_method" ("id", "companyId", "kind", "label", "handle", "instructions", "isActive", "displayOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s."companyId", 'MANUAL'::"PaymentKind", 'PIX',
       s."pixKey", 'Pague usando a chave PIX e aguarde a confirmação da empresa.',
       s."enablePix", 5, NOW(), NOW()
FROM "company_payment_settings" s
WHERE s."pixKey" IS NOT NULL AND s."mercadoPagoAccessToken" IS NULL;

-- Vincula bookings históricos à forma de pagamento equivalente
UPDATE "booking" b
SET "companyPaymentMethodId" = m."id"
FROM "company_payment_method" m
WHERE m."companyId" = b."companyId"
  AND (
    (b."paymentMethod" = 'CARD'       AND m."kind" = 'STRIPE_CARD') OR
    (b."paymentMethod" = 'CASH_CHECK' AND m."kind" = 'MANUAL' AND m."label" = 'Dinheiro/Cheque') OR
    (b."paymentMethod" = 'PIX'        AND m."label" = 'PIX')
  );
