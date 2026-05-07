import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getActiveAgendas } from "@/server/queries/agendas";
import { getServices, getExtraServices } from "@/server/queries/services";
import { BookingConfigFormClient } from "../_components/booking-config-form-client";
import { notFound, redirect } from "next/navigation";

export default async function NovaBookingConfigPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();
  if (company.members[0].role === "EMPLOYEE")
    redirect(`/${companySlug}/booking`);

  const [agendas, services, extraServices] = await Promise.all([
    getActiveAgendas(company.id),
    getServices(company.id),
    getExtraServices(company.id),
  ]);

  return (
    <BookingConfigFormClient
      companySlug={companySlug}
      agendas={agendas.map((a) => ({ id: a.id, name: a.name }))}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        serviceTypes: s.serviceTypes.map((st) => ({
          id: st.id,
          name: st.name,
          estimatedMinutes: st.estimatedMinutes,
          price: Number(st.price),
        })),
      }))}
      extraServices={extraServices.map((e) => ({ id: e.id, name: e.name }))}
    />
  );
}
