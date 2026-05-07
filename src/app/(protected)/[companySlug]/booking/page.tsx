import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getBookingConfigs } from "@/server/queries/booking-configs";
import { getActiveAgendas } from "@/server/queries/agendas";
import { BookingConfigsClient } from "./booking-configs-client";
import { notFound } from "next/navigation";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const [configs, agendas] = await Promise.all([
    getBookingConfigs(company.id),
    getActiveAgendas(company.id),
  ]);

  const role = company.members[0].role;

  return (
    <BookingConfigsClient
      companySlug={companySlug}
      configs={configs.map((c) => ({
        ...c,
        serviceTypes: c.serviceTypes.map((st) => ({
          serviceType: {
            id: st.serviceType.id,
            name: st.serviceType.name,
            serviceName: st.serviceType.service.name,
          },
        })),
        extraServices: c.extraServices.map((es) => ({
          extraService: { id: es.extraService.id, name: es.extraService.name },
        })),
      }))}
      agendas={agendas}
      canManage={role !== "EMPLOYEE"}
      isOwner={role === "OWNER"}
    />
  );
}
