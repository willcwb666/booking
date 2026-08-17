import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getServiceByIdAction } from "@/server/actions/services";
import { notFound } from "next/navigation";
import { ServiceFormClient } from "../../_components/service-form-client";

export default async function EditarServicoPage({
  params,
}: {
  params: Promise<{ companySlug: string; id: string }>;
}) {
  const { companySlug, id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const serviceData = await getServiceByIdAction(companySlug, id);
  if (!serviceData) notFound();

  return (
    <ServiceFormClient
      companySlug={companySlug}
      initialData={serviceData}
    />
  );
}
