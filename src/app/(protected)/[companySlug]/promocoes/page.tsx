import { canAccessModule } from "@/lib/module-guard";
import { MODULE_CODES } from "@/lib/module-codes";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PromocoesClient } from "./promocoes-client";

export default async function PromocoesPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  /**
   * Modulo licenciado. Ate aqui a licenca so escondia o item do MENU — quem
   * soubesse a URL entrava e usava a funcionalidade paga inteira.
   */
  const moduleAccess = await canAccessModule(companySlug, MODULE_CODES.promotions);
  if (!moduleAccess.ok) notFound();
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const [promotions, serviceTypes, optInCount] = await Promise.all([
    db.promotion.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        serviceType: { select: { id: true, name: true, price: true, service: { select: { name: true } } } },
      },
    }),
    db.serviceType.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: [{ service: { order: "asc" } }, { order: "asc" }],
      select: { id: true, name: true, price: true, service: { select: { name: true } } },
    }),
    db.user.count({
      where: { banned: { not: true }, notificationPrefs: { enableMarketing: true } },
    }),
  ]);

  return (
    <PromocoesClient
      companySlug={companySlug}
      optInCount={optInCount}
      promotions={promotions.map((p) => ({
        id: p.id,
        description: p.description,
        promoPrice: Number(p.promoPrice),
        startDate: p.startDate,
        endDate: p.endDate,
        isActive: p.isActive,
        lastSentAt: p.lastSentAt?.toISOString() ?? null,
        serviceTypeId: p.serviceType.id,
        serviceName: `${p.serviceType.service.name} — ${p.serviceType.name}`,
        servicePrice: Number(p.serviceType.price),
      }))}
      serviceTypes={serviceTypes.map((st) => ({
        id: st.id,
        label: `${st.service.name} — ${st.name}`,
        price: Number(st.price),
      }))}
    />
  );
}
