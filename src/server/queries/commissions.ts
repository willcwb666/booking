import "server-only";
import { db } from "@/lib/db";
import { calculateCommission } from "@/lib/pricing";

export type ProfessionalCommissionSummary = {
  id: string;
  name: string;
  email: string | null;
  commissionPercentage: number;
  completedBookingsCount: number;
  totalRevenueGenerated: number;
  totalCommissionAmount: number;
  companyRetainedAmount: number;
  recentBookings: Array<{
    id: string;
    customerName: string;
    scheduledDate: string;
    serviceName: string;
    total: number;
    commission: number;
  }>;
};

export type CommissionReport = {
  professionals: ProfessionalCommissionSummary[];
  totalGrossRevenue: number;
  totalCommissionsOwed: number;
  totalNetCompany: number;
  totalCompletedCount: number;
};

export async function getCompanyCommissionReport(
  companyId: string,
  startDate?: string,
  endDate?: string
): Promise<CommissionReport> {
  // 1. Buscar profissionais da empresa
  const professionals = await db.professional.findMany({
    where: { companyId, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      commissionPercentage: true,
    },
    orderBy: { name: "asc" },
  });

  // 2. Buscar agendamentos concluídos no período
  const dateFilter: Record<string, string> = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) dateFilter.lte = endDate;

  const bookings = await db.booking.findMany({
    where: {
      companyId,
      status: "COMPLETED",
      ...(startDate || endDate ? { scheduledDate: dateFilter } : {}),
    },
    include: {
      customerDetail: { select: { firstName: true, lastName: true } },
      estimate: {
        select: {
          total: true,
          serviceTypes: {
            include: {
              serviceType: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { scheduledDate: "desc" },
  });

  // 3. Mapear e calcular comissão por profissional
  const profMap = new Map<string, ProfessionalCommissionSummary>();

  for (const p of professionals) {
    profMap.set(p.id, {
      id: p.id,
      name: p.name,
      email: p.email,
      commissionPercentage: p.commissionPercentage ?? 0,
      completedBookingsCount: 0,
      totalRevenueGenerated: 0,
      totalCommissionAmount: 0,
      companyRetainedAmount: 0,
      recentBookings: [],
    });
  }

  // Agrupar bookings
  let totalGrossRevenue = 0;
  let totalCommissionsOwed = 0;
  let totalCompletedCount = 0;

  for (const b of bookings) {
    const amount = Number(b.estimate?.total ?? 0);
    totalGrossRevenue += amount;
    totalCompletedCount += 1;

    const profId = b.professionalId;
    if (profId && profMap.has(profId)) {
      const pSummary = profMap.get(profId)!;
      pSummary.completedBookingsCount += 1;
      pSummary.totalRevenueGenerated += amount;

      const { commission: commAmount, companyRetained } = calculateCommission(
        amount,
        pSummary.commissionPercentage,
      );
      pSummary.totalCommissionAmount += commAmount;
      pSummary.companyRetainedAmount += companyRetained;
      totalCommissionsOwed += commAmount;

      const custName = b.customerDetail
        ? `${b.customerDetail.firstName} ${b.customerDetail.lastName}`.trim()
        : "Cliente";

      const srvName =
        b.estimate?.serviceTypes?.[0]?.serviceType?.name ?? "Serviço";

      if (pSummary.recentBookings.length < 15) {
        pSummary.recentBookings.push({
          id: b.id,
          customerName: custName,
          scheduledDate: b.scheduledDate,
          serviceName: srvName,
          total: amount,
          commission: commAmount,
        });
      }
    }
  }

  const profList = Array.from(profMap.values());

  return {
    professionals: profList,
    totalGrossRevenue,
    totalCommissionsOwed,
    totalNetCompany: totalGrossRevenue - totalCommissionsOwed,
    totalCompletedCount,
  };
}
