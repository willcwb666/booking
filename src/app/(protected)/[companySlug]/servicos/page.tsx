import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { ServicosClient, type UnifiedServiceRow } from "./servicos-client";
import { notFound } from "next/navigation";

export default async function ServicosPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const [services, extraServices] = await Promise.all([
    db.service.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { order: "asc" },
      include: {
        serviceTypes: {
          where: { isActive: true },
          take: 1,
        },
      },
    }),
    db.extraService.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const unifiedList: UnifiedServiceRow[] = [
    ...services.map((s) => {
      const st = s.serviceTypes[0];
      return {
        id: s.id,
        name: s.name,
        description: s.description ?? null,
        type: "PADRÃO" as const,
        price: st ? Number(st.price) : 0,
        estimatedMinutes: st ? st.estimatedMinutes : 30,
        icon: s.icon ?? "scissors",
        isActive: Boolean(s.isActive),
      };
    }),
    ...extraServices.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description ?? null,
      type: "EXTRA" as const,
      price: Number(e.price),
      estimatedMinutes: Number(e.estimatedMinutes),
      icon: e.icon ?? "sparkles",
      isActive: Boolean(e.isActive),
    })),
  ];

  return (
    <ServicosClient
      companySlug={companySlug}
      services={unifiedList}
    />
  );
}
