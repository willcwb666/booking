-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'PENDING', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EstimateFrequency" AS ENUM ('ONCE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "estimate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bookingConfigId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerEmail" TEXT,
    "customerName" TEXT,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "frequency" "EstimateFrequency" NOT NULL DEFAULT 'ONCE',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_service_type" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "estimate_service_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_extra_service" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "extraServiceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "estimate_extra_service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_bookingConfigId_status_idx" ON "estimate"("bookingConfigId", "status");

-- CreateIndex
CREATE INDEX "estimate_customerId_status_idx" ON "estimate"("customerId", "status");

-- CreateIndex
CREATE INDEX "estimate_service_type_estimateId_idx" ON "estimate_service_type"("estimateId");

-- CreateIndex
CREATE INDEX "estimate_extra_service_estimateId_idx" ON "estimate_extra_service"("estimateId");

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_bookingConfigId_fkey" FOREIGN KEY ("bookingConfigId") REFERENCES "booking_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_service_type" ADD CONSTRAINT "estimate_service_type_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_service_type" ADD CONSTRAINT "estimate_service_type_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_extra_service" ADD CONSTRAINT "estimate_extra_service_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_extra_service" ADD CONSTRAINT "estimate_extra_service_extraServiceId_fkey" FOREIGN KEY ("extraServiceId") REFERENCES "extra_service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
