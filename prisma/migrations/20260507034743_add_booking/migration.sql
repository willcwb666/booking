-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'CASH_CHECK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "bookingConfigId" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "professionalId" TEXT,
    "scheduledDate" TEXT NOT NULL,
    "scheduledStartTime" TEXT NOT NULL,
    "scheduledEndTime" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_slot" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "booking_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_customer_detail" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sendReminders" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT NOT NULL,
    "aptNo" TEXT,
    "city" TEXT NOT NULL,
    "zip" TEXT NOT NULL,

    CONSTRAINT "booking_customer_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_home_access" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "keepKeyWithProvider" BOOLEAN NOT NULL DEFAULT false,
    "accessNote" TEXT,
    "additionalNote" TEXT,

    CONSTRAINT "booking_home_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_estimateId_key" ON "booking"("estimateId");

-- CreateIndex
CREATE INDEX "booking_companyId_scheduledDate_idx" ON "booking"("companyId", "scheduledDate");

-- CreateIndex
CREATE INDEX "booking_agendaId_scheduledDate_idx" ON "booking"("agendaId", "scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "booking_slot_bookingId_key" ON "booking_slot"("bookingId");

-- CreateIndex
CREATE INDEX "booking_slot_agendaId_date_idx" ON "booking_slot"("agendaId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "booking_slot_agendaId_date_startTime_key" ON "booking_slot"("agendaId", "date", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "booking_customer_detail_bookingId_key" ON "booking_customer_detail"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "booking_home_access_bookingId_key" ON "booking_home_access"("bookingId");

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_bookingConfigId_fkey" FOREIGN KEY ("bookingConfigId") REFERENCES "booking_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agenda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slot" ADD CONSTRAINT "booking_slot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_slot" ADD CONSTRAINT "booking_slot_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agenda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_customer_detail" ADD CONSTRAINT "booking_customer_detail_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_home_access" ADD CONSTRAINT "booking_home_access_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
