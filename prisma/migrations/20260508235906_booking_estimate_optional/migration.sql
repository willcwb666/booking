-- DropForeignKey
ALTER TABLE "booking" DROP CONSTRAINT "booking_estimateId_fkey";

-- AlterTable
ALTER TABLE "booking" ALTER COLUMN "estimateId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
