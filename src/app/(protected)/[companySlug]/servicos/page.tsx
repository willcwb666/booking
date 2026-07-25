import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getServices, getExtraServices } from "@/server/queries/services";
import { db } from "@/lib/db";
import { ServicosClient, type UnifiedServiceRow } from "./servicos-client";
import { notFound } from "next/navigation";

async function unwrapPresetContainerService(companyId: string) {
  try {
    const containerServices = await db.service.findMany({
      where: { companyId, name: { contains: "Preset Restaurado" } },
      include: { serviceTypes: true },
    });

    for (const cSrv of containerServices) {
      for (const st of cSrv.serviceTypes) {
        const newSrvId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.$executeRawUnsafe(
          `INSERT INTO "service" ("id", "companyId", "name", "description", "icon", "order", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, 'scissors', $5, $6, NOW(), NOW())`,
          newSrvId,
          companyId,
          st.name,
          st.description || cSrv.description,
          st.order,
          st.isActive
        );

        await db.serviceType.create({
          data: {
            companyId,
            serviceId: newSrvId,
            name: st.name,
            description: st.description,
            price: st.price,
            estimatedMinutes: st.estimatedMinutes,
            order: 0,
            isActive: st.isActive,
          },
        });
      }

      await db.serviceType.deleteMany({ where: { serviceId: cSrv.id } });
      await db.service.delete({ where: { id: cSrv.id } });
    }
  } catch (err) {
    console.error("Erro ao desembrulhar container de serviços:", err);
  }
}

export default async function ServicosPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  await unwrapPresetContainerService(company.id);

  const [servicesRows, extraServicesRows] = await Promise.all([
    db.$queryRawUnsafe<Array<any>>(
      `SELECT * FROM "service" WHERE "companyId" = $1 AND "isActive" = true ORDER BY "order" ASC`,
      company.id
    ),
    db.$queryRawUnsafe<Array<any>>(
      `SELECT * FROM "extra_service" WHERE "companyId" = $1 AND "isActive" = true ORDER BY "order" ASC`,
      company.id
    ),
  ]);

  const unifiedList: UnifiedServiceRow[] = [];

  for (const s of servicesRows) {
    const st = await db.serviceType.findFirst({ where: { serviceId: s.id, companyId: company.id } });
    unifiedList.push({
      id: s.id,
      name: s.name,
      description: s.description || null,
      type: "PADRÃO",
      price: st ? Number(st.price) : 0,
      estimatedMinutes: st ? st.estimatedMinutes : 30,
      icon: s.icon || "scissors",
      isActive: Boolean(s.isActive),
    });
  }

  for (const e of extraServicesRows) {
    unifiedList.push({
      id: e.id,
      name: e.name,
      description: e.description || null,
      type: "EXTRA",
      price: Number(e.price),
      estimatedMinutes: Number(e.estimatedMinutes),
      icon: e.icon || "sparkles",
      isActive: Boolean(e.isActive),
    });
  }

  return (
    <ServicosClient
      companySlug={companySlug}
      services={unifiedList}
    />
  );
}
