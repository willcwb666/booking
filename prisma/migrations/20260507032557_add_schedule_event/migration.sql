-- CreateEnum
CREATE TYPE "ScheduleEventType" AS ENUM ('APPOINTMENT', 'EVENT', 'ESTIMATE');

-- CreateTable
CREATE TABLE "schedule_event" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "professionalId" TEXT,
    "title" TEXT NOT NULL,
    "type" "ScheduleEventType" NOT NULL DEFAULT 'EVENT',
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_event_companyId_date_idx" ON "schedule_event"("companyId", "date");

-- CreateIndex
CREATE INDEX "schedule_event_professionalId_date_idx" ON "schedule_event"("professionalId", "date");

-- AddForeignKey
ALTER TABLE "schedule_event" ADD CONSTRAINT "schedule_event_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_event" ADD CONSTRAINT "schedule_event_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_event" ADD CONSTRAINT "schedule_event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
