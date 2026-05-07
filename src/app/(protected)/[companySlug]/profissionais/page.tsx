import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getProfessionals } from "@/server/queries/professionals";
import { checkFeature } from "@/lib/features";
import { ProfissionaisClient } from "./profissionais-client";
import { notFound } from "next/navigation";

export default async function ProfissionaisPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const [professionals, feature] = await Promise.all([
    getProfessionals(company.id),
    checkFeature(company.id, "max_professionals"),
  ]);

  return (
    <ProfissionaisClient
      companySlug={companySlug}
      professionals={professionals}
      limit={feature.limit}
    />
  );
}
