import { getAdminStats, getAdminFinanceData } from "@/server/queries/admin";
import { db } from "@/lib/db";
import { FinanceClient } from "./finance-client";

export default async function AdminFinanceiroPage() {
  const [stats, financeData, plans] = await Promise.all([
    getAdminStats(),
    getAdminFinanceData(),
    db.plan.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        displayName: true,
        priceMonthly: true,
        priceYearly: true,
      },
    }),
  ]);

  const formattedPlans = plans.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    priceMonthly: Number(p.priceMonthly),
    priceYearly: Number(p.priceYearly),
  }));

  return (
    <FinanceClient
      initialCompanies={financeData}
      stats={stats}
      availablePlans={formattedPlans}
    />
  );
}
