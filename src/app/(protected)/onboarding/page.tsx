import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserCompanies } from "@/server/queries/companies";
import { getPlans } from "@/server/queries/plans";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [companies, dbUser] = await Promise.all([
    getUserCompanies(session.user.id),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { allowMultiCompany: true },
    }),
  ]);

  // Com multiempresas ativo, o onboarding também serve para criar empresas
  // adicionais; sem o modo, quem já tem empresa vai direto para o painel
  if (companies.length > 0 && !dbUser?.allowMultiCompany) {
    redirect(`/${companies[0].company.slug}/dashboard`);
  }

  const plans = await getPlans();

  const serializedPlans = plans.map((p) => ({
    id: p.id,
    tier: p.tier,
    displayName: p.displayName,
    description: p.description,
    priceMonthly: Number(p.priceMonthly),
    priceYearly: Number(p.priceYearly),
    features: p.features.map((f) => ({
      featureKey: f.featureKey,
      featureLabel: f.featureLabel,
      enabled: f.enabled,
      limitValue: f.limitValue,
    })),
  }));

  return (
    <OnboardingClient
      plans={serializedPlans}
      userName={session.user.name}
      isAdditionalCompany={companies.length > 0}
      multiCompanyEnabled={dbUser?.allowMultiCompany ?? false}
    />
  );
}
