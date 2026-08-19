import { notFound, redirect } from "next/navigation";
import { getCompanyBySlug } from "@/server/queries/companies";
import { getCustomerPortalBookings } from "@/server/queries/bookings";
import { getCustomerOverview } from "@/server/queries/analytics";
import { resolveRange, type RangeSearchParams } from "@/lib/analytics-range";
import { getActiveSession } from "@/lib/session";
import { MeusAgendamentosClient } from "./meus-agendamentos-client";

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<RangeSearchParams>;
};

export default async function MeusAgendamentosPage({ params, searchParams }: Props) {
  const { companySlug } = await params;

  const session = await getActiveSession();
  if (!session) redirect("/login");

  const company = await getCompanyBySlug(companySlug);
  if (!company) notFound();

  const range = resolveRange(await searchParams);

  const [bookings, overview] = await Promise.all([
    getCustomerPortalBookings({
      companyId: company.id,
      userId: session.user.id,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
    }),
    // O resumo casa o histórico pelo e-mail do orçamento. Sem e-mail
    // verificado isso permitiria ver o histórico de outra pessoa só se
    // cadastrando com o endereço dela — mesma trava que já protege a lista.
    session.user.emailVerified
      ? getCustomerOverview(company.id, session.user.email, range)
      : Promise.resolve(null),
  ]);

  return (
    <MeusAgendamentosClient
      companySlug={companySlug}
      companyName={company.name}
      companyPhone={company.phone ?? null}
      currency={company.currency}
      locale={company.locale}
      bookings={bookings}
      emailVerified={session.user.emailVerified}
      range={range}
      overview={overview}
    />
  );
}
