import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { notFound } from "next/navigation";
import { ServiceFormClient } from "../_components/service-form-client";

export default async function NovoServicoPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  return <ServiceFormClient companySlug={companySlug} />;
}
