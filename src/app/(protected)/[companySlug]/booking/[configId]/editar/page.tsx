import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getActiveAgendas } from "@/server/queries/agendas";
import { getServices, getExtraServices } from "@/server/queries/services";
import { getBookingConfigById } from "@/server/queries/booking-configs";
import { BookingConfigFormClient } from "../../_components/booking-config-form-client";
import { notFound, redirect } from "next/navigation";

export default async function EditarBookingConfigPage({
  params,
}: {
  params: Promise<{ companySlug: string; configId: string }>;
}) {
  const { companySlug, configId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();
  if (company.members[0].role === "EMPLOYEE")
    redirect(`/${companySlug}/booking`);

  const [config, agendas, services, extraServices] = await Promise.all([
    getBookingConfigById(configId, company.id),
    getActiveAgendas(company.id),
    getServices(company.id),
    getExtraServices(company.id),
  ]);

  if (!config) notFound();

  // Include the config's own agenda even if it's no longer "active"
  // so editing doesn't lose the reference
  const agendaList = agendas.map((a) => ({ id: a.id, name: a.name }));
  if (!agendaList.some((a) => a.id === config.agendaId)) {
    agendaList.push({ id: config.agenda.id, name: config.agenda.name });
  }

  return (
    <BookingConfigFormClient
      companySlug={companySlug}
      agendas={agendaList}
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
      existing={{
        id: config.id,
        name: config.name,
        agendaId: config.agendaId,
        allowPartialService: config.allowPartialService,
        serviceTypes: config.serviceTypes.map((st) => ({
          serviceType: { id: st.serviceType.id },
        })),
        extraServices: config.extraServices.map((es) => ({
          extraService: { id: es.extraService.id },
        })),
      }}
    />
  );
}
