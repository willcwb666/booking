import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getServices, getExtraServices } from "@/server/queries/services";
import { checkFeature } from "@/lib/features";
import { ServicosClient } from "./servicos-client";
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

  const [services, extraServices, extraFeature] = await Promise.all([
    getServices(company.id),
    getExtraServices(company.id),
    checkFeature(company.id, "extra_services"),
  ]);

  // Prisma Decimal → number for client serialization
  const serializedServices = services.map((s) => ({
    ...s,
    serviceTypes: s.serviceTypes.map((st) => ({
      ...st,
      price: Number(st.price),
    })),
  }));

  const serializedExtras = extraServices.map((e) => ({
    ...e,
    price: Number(e.price),
  }));

  return (
    <ServicosClient
      companySlug={companySlug}
      services={serializedServices}
      extraServices={serializedExtras}
      extrasEnabled={extraFeature.enabled}
    />
  );
}
