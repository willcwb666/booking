import { canAccessModule } from "@/lib/module-guard";
import { MODULE_CODES } from "@/lib/module-codes";
import { getCompanyLoyaltyProgramAction } from "@/server/actions/loyalty";
import { LoyaltyClient } from "./loyalty-client";
import { notFound } from "next/navigation";

export default async function LoyaltyPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  /**
   * Modulo licenciado. Ate aqui a licenca so escondia o item do MENU — quem
   * soubesse a URL entrava e usava a funcionalidade paga inteira.
   */
  const moduleAccess = await canAccessModule(companySlug, MODULE_CODES.loyalty);
  if (!moduleAccess.ok) notFound();

  const res = await getCompanyLoyaltyProgramAction(companySlug);
  if (!res.success || !res.program) {
    notFound();
  }

  return (
    <LoyaltyClient
      companySlug={companySlug}
      initialProgram={res.program}
      customers={res.customers || []}
    />
  );
}
