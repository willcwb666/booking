"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// `getCompanyReportsAction` foi REMOVIDA daqui. A tela de relatórios da
// empresa agora usa `getCompanyOverview`, que agrega no banco e respeita o
// filtro de período. A action antiga verificava apenas se havia sessão, sem
// checar vínculo com a empresa: qualquer usuário logado lia o faturamento de
// qualquer empresa trocando o slug. Manter exportada só por estar sem uso
// não resolveria — server action continua sendo um endpoint alcançável.


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
