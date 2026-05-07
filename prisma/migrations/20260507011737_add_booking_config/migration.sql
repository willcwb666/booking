-- CreateEnum
CREATE TYPE "BookingConfigStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "booking_config" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BookingConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "allowPartialService" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_config_service_type" (
    "bookingConfigId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,

    CONSTRAINT "booking_config_service_type_pkey" PRIMARY KEY ("bookingConfigId","serviceTypeId")
);

-- CreateTable
CREATE TABLE "booking_config_extra_service" (
    "bookingConfigId" TEXT NOT NULL,
    "extraServiceId" TEXT NOT NULL,

    CONSTRAINT "booking_config_extra_service_pkey" PRIMARY KEY ("bookingConfigId","extraServiceId")
);

-- CreateIndex
CREATE INDEX "booking_config_companyId_status_idx" ON "booking_config"("companyId", "status");

-- CreateIndex
CREATE INDEX "booking_config_agendaId_idx" ON "booking_config"("agendaId");

-- CreateIndex
CREATE INDEX "booking_config_service_type_bookingConfigId_idx" ON "booking_config_service_type"("bookingConfigId");

-- CreateIndex
CREATE INDEX "booking_config_service_type_serviceTypeId_idx" ON "booking_config_service_type"("serviceTypeId");

-- CreateIndex
CREATE INDEX "booking_config_extra_service_bookingConfigId_idx" ON "booking_config_extra_service"("bookingConfigId");

-- CreateIndex
CREATE INDEX "booking_config_extra_service_extraServiceId_idx" ON "booking_config_extra_service"("extraServiceId");

-- AddForeignKey
ALTER TABLE "booking_config" ADD CONSTRAINT "booking_config_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_config" ADD CONSTRAINT "booking_config_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agenda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_config" ADD CONSTRAINT "booking_config_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_config_service_type" ADD CONSTRAINT "booking_config_service_type_bookingConfigId_fkey" FOREIGN KEY ("bookingConfigId") REFERENCES "booking_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_config_service_type" ADD CONSTRAINT "booking_config_service_type_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_config_extra_service" ADD CONSTRAINT "booking_config_extra_service_bookingConfigId_fkey" FOREIGN KEY ("bookingConfigId") REFERENCES "booking_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_config_extra_service" ADD CONSTRAINT "booking_config_extra_service_extraServiceId_fkey" FOREIGN KEY ("extraServiceId") REFERENCES "extra_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
