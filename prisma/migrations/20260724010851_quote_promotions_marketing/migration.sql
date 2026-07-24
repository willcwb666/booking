-- AlterTable
ALTER TABLE "extra_service" ADD COLUMN     "allowQuantity" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "service_type" ADD COLUMN     "allowQuantity" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_notification_preference" ADD COLUMN     "enableMarketing" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "promotion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "serviceTypeId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "promoPrice" DECIMAL(10,2) NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotion_companyId_isActive_idx" ON "promotion"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "promotion_serviceTypeId_startDate_endDate_idx" ON "promotion"("serviceTypeId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "promotion" ADD CONSTRAINT "promotion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion" ADD CONSTRAINT "promotion_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;
