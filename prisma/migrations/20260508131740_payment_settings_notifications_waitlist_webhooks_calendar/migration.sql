-- CreateEnum
CREATE TYPE "AgendaExceptionType" AS ENUM ('BLOCKED_DAY', 'CUSTOM_HOURS');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_COMPLETED', 'BOOKING_RESCHEDULED', 'REVIEW_SUBMITTED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'PIX';

-- AlterTable
ALTER TABLE "booking" ADD COLUMN     "recurrenceEndDate" TEXT,
ADD COLUMN     "recurrenceFrequency" "EstimateFrequency",
ADD COLUMN     "recurrenceGroupId" TEXT,
ADD COLUMN     "refundAmount" DECIMAL(10,2),
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "rescheduledAt" TIMESTAMP(3),
ADD COLUMN     "rescheduledFromId" TEXT;

-- CreateTable
CREATE TABLE "user_notification_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enableEmail" BOOLEAN NOT NULL DEFAULT true,
    "enablePush" BOOLEAN NOT NULL DEFAULT true,
    "enableWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "enableSms" BOOLEAN NOT NULL DEFAULT false,
    "whatsappPhone" TEXT,
    "smsPhone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_payment_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enableCard" BOOLEAN NOT NULL DEFAULT true,
    "enableCashCheck" BOOLEAN NOT NULL DEFAULT true,
    "enablePix" BOOLEAN NOT NULL DEFAULT false,
    "pixKey" TEXT,
    "pixKeyType" TEXT,
    "mercadoPagoAccessToken" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_exception" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" "AgendaExceptionType" NOT NULL DEFAULT 'BLOCKED_DAY',
    "reason" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agenda_exception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "bookingConfigId" TEXT NOT NULL,
    "preferredDate" TEXT NOT NULL,
    "preferredStartTime" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_webhook" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" "WebhookEvent"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_integration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "calendarId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preference_userId_key" ON "user_notification_preference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "company_payment_settings_companyId_key" ON "company_payment_settings"("companyId");

-- CreateIndex
CREATE INDEX "agenda_exception_agendaId_idx" ON "agenda_exception"("agendaId");

-- CreateIndex
CREATE UNIQUE INDEX "agenda_exception_agendaId_date_key" ON "agenda_exception"("agendaId", "date");

-- CreateIndex
CREATE INDEX "waitlist_entry_companyId_status_idx" ON "waitlist_entry"("companyId", "status");

-- CreateIndex
CREATE INDEX "waitlist_entry_agendaId_preferredDate_idx" ON "waitlist_entry"("agendaId", "preferredDate");

-- CreateIndex
CREATE INDEX "company_webhook_companyId_isActive_idx" ON "company_webhook"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "calendar_integration_userId_idx" ON "calendar_integration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_integration_userId_provider_key" ON "calendar_integration"("userId", "provider");

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preference" ADD CONSTRAINT "user_notification_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_payment_settings" ADD CONSTRAINT "company_payment_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_exception" ADD CONSTRAINT "agenda_exception_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entry" ADD CONSTRAINT "waitlist_entry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entry" ADD CONSTRAINT "waitlist_entry_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entry" ADD CONSTRAINT "waitlist_entry_bookingConfigId_fkey" FOREIGN KEY ("bookingConfigId") REFERENCES "booking_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_webhook" ADD CONSTRAINT "company_webhook_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_integration" ADD CONSTRAINT "calendar_integration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
