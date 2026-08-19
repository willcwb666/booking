import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getCompanyOverview } from "@/server/queries/analytics";
import { resolveRange, type RangeSearchParams } from "@/lib/analytics-range";
import { CompanyRelatoriosClient } from "./relatorios-client";

/**
 * Relatórios da empresa.
 *
 * Duas correções em relação à versão anterior, que chamava
 * `getCompanyReportsAction(companySlug)`:
 *
 *  · Aquela action só verificava se havia sessão — nenhuma checagem de vínculo
 *    com a empresa. Qualquer usuário logado lia o faturamento, a contagem de
 *    agendamentos e o ranking de serviços de QUALQUER empresa, só trocando o
 *    slug na URL. Aqui a empresa é resolvida por
 *    `getCompanyBySlugForUser`, que exige o vínculo.
 *
 *  · Ela também carregava TODOS os agendamentos da empresa, com orçamento e
 *    tipos de serviço, para somar em JavaScript. `getCompanyOverview` faz a
 *    mesma conta com GROUP BY no banco e ainda respeita o filtro de período.
 */
export default async function CompanyRelatoriosPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<RangeSearchParams>;
}) {
  const { companySlug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const company = await getCompanyBySlugForUser(companySlug, session.user.id);
  if (!company) notFound();

  const range = resolveRange(await searchParams);
  const overview = await getCompanyOverview(company.id, range);

  return (
    <CompanyRelatoriosClient
      companySlug={companySlug}
      range={range}
      overview={overview}
    />
  );
}
