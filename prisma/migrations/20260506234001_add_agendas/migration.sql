-- CreateEnum
CREATE TYPE "AgendaStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "agenda" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AgendaStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "workingDays" INTEGER[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "intervalMinutes" INTEGER NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_professional" (
    "agendaId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,

    CONSTRAINT "agenda_professional_pkey" PRIMARY KEY ("agendaId","professionalId")
);

-- CreateIndex
CREATE INDEX "agenda_companyId_status_idx" ON "agenda"("companyId", "status");

-- CreateIndex
CREATE INDEX "agenda_companyId_startDate_idx" ON "agenda"("companyId", "startDate");

-- CreateIndex
CREATE INDEX "agenda_professional_agendaId_idx" ON "agenda_professional"("agendaId");

-- CreateIndex
CREATE INDEX "agenda_professional_professionalId_idx" ON "agenda_professional"("professionalId");

-- AddForeignKey
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda" ADD CONSTRAINT "agenda_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_professional" ADD CONSTRAINT "agenda_professional_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_professional" ADD CONSTRAINT "agenda_professional_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
