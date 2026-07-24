"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getCompanyReportsAction(companySlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const company = await db.company.findFirst({
    where: { slug: companySlug },
    select: { id: true, name: true, currency: true, locale: true },
  });

  if (!company) return { success: false, error: "Empresa não encontrada" };

  try {
    // 1. Agendamentos consolidados
    const bookings = await db.booking.findMany({
      where: { companyId: company.id },
      include: {
        estimate: {
          select: {
            total: true,
            serviceTypes: { select: { serviceType: { select: { name: true } } } },
          },
        },
        customerDetail: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledDate: "desc" },
    });

    let totalRevenue = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let pendingCount = 0;

    const serviceRevenueMap: Record<string, { count: number; revenue: number }> = {};

    for (const b of bookings) {
      if (b.status === "COMPLETED") {
        completedCount++;
        const price = Number(b.estimate?.total || 0);
        totalRevenue += price;

        const sName = b.estimate?.serviceTypes[0]?.serviceType.name ?? "Serviço";
        if (!serviceRevenueMap[sName]) serviceRevenueMap[sName] = { count: 0, revenue: 0 };
        serviceRevenueMap[sName].count += 1;
        serviceRevenueMap[sName].revenue += price;
      } else if (b.status === "CANCELLED") {
        cancelledCount++;
      } else {
        pendingCount++;
      }
    }

    const topServices = Object.entries(serviceRevenueMap)
      .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      success: true,
      reports: {
        totalRevenue,
        totalBookings: bookings.length,
        completedCount,
        cancelledCount,
        pendingCount,
        conversionRate: bookings.length > 0 ? (completedCount / bookings.length) * 100 : 0,
        topServices,
      },
    };
  } catch (err) {
    console.error("Erro ao gerar relatórios da empresa:", err);
    return { success: false, error: "Falha ao gerar relatórios." };
  }
}

export async function getSuperAdminReportsAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, error: "Acesso negado — Apenas Super Admin" };
  }

  try {
    const companies = await db.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        businessType: true,
        subscriptionStatus: true,
        subscriptionInterval: true,
        plan: { select: { displayName: true, priceMonthly: true, priceYearly: true } },
        _count: { select: { bookings: true, members: true } },
      },
    });

    let mrr = 0;
    let activeCompanies = 0;
    let overdueCompanies = 0;

    const planDistributionMap: Record<string, number> = {};

    for (const c of companies) {
      if (c.subscriptionStatus === "past_due" || c.subscriptionStatus === "unpaid") {
        overdueCompanies++;
      } else if (c.subscriptionStatus !== "canceled") {
        activeCompanies++;
        const pName = c.plan.displayName;
        planDistributionMap[pName] = (planDistributionMap[pName] || 0) + 1;

        const mPrice = Number(c.plan.priceMonthly || 0);
        const yPrice = Number(c.plan.priceYearly || 0);
        if (c.subscriptionInterval === "year" && yPrice > 0) {
          mrr += yPrice / 12;
        } else {
          mrr += mPrice;
        }
      }
    }

    const topCompaniesByVolume = companies
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        planName: c.plan.displayName,
        bookingCount: c._count.bookings,
        memberCount: c._count.members,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 10);

    return {
      success: true,
      reports: {
        mrr,
        arr: mrr * 12,
        totalCompaniesCount: companies.length,
        activeCompanies,
        overdueCompanies,
        planDistribution: Object.entries(planDistributionMap).map(([name, count]) => ({ name, count })),
        topCompaniesByVolume,
      },
    };
  } catch (err) {
    console.error("Erro ao gerar relatórios do super admin:", err);
    return { success: false, error: "Falha ao gerar relatórios da plataforma." };
  }
}
