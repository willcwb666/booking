import { getCompanyLoyaltyProgramAction } from "@/server/actions/loyalty";
import { LoyaltyClient } from "./loyalty-client";
import { notFound } from "next/navigation";

export default async function LoyaltyPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

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
