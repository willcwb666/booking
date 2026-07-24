import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PLATFORM_BILLING_CURRENCY } from "@/lib/stripe-billing";
import { SettingsClient } from "./settings-client";

export default async function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const dbUser = await db.user.findUnique({
    where: { id: session!.user.id },
    select: { allowMultiCompany: true },
  });

  const role = company.members[0].role;
  const canEdit = role === "OWNER" || role === "MANAGER";
  const isOwner = role === "OWNER";

  const [paymentMethods, fullCompany, availablePlans] = await Promise.all([
    db.companyPaymentMethod.findMany({
      where: { companyId: company.id },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        kind: true,
        label: true,
        handle: true,
        instructions: true,
        isActive: true,
      },
    }),
    db.company.findUnique({
      where: { id: company.id },
      select: {
        planId: true,
        subscriptionStatus: true,
        subscriptionInterval: true,
        subscriptionPeriodEnd: true,
        stripeCustomerId: true,
      },
    }),
    db.plan.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true, displayName: true, description: true,
        priceMonthly: true, priceYearly: true,
        stripePriceMonthlyId: true, stripePriceYearlyId: true,
      },
    }),
  ]);

  return (
    <SettingsClient
      companySlug={companySlug}
      canEdit={canEdit}
      initial={{
        name: company.name,
        phone: company.phone ?? "",
        address: company.address ?? "",
        timezone: company.timezone,
        currency: company.currency,
        locale: company.locale,
        logoUrl: company.logoUrl,
      }}
      bookingBaseUrl={`/book/${companySlug}`}
      paymentMethods={paymentMethods}
      multiCompany={dbUser?.allowMultiCompany ?? false}
      billing={{
        isOwner,
        currency: PLATFORM_BILLING_CURRENCY,
        currentPlanId: fullCompany?.planId ?? "",
        subscriptionStatus: fullCompany?.subscriptionStatus ?? null,
        subscriptionInterval: fullCompany?.subscriptionInterval ?? null,
        subscriptionPeriodEnd: fullCompany?.subscriptionPeriodEnd?.toISOString() ?? null,
        hasCustomer: Boolean(fullCompany?.stripeCustomerId),
        plans: availablePlans.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          description: p.description ?? "",
          priceMonthly: Number(p.priceMonthly),
          priceYearly: Number(p.priceYearly),
          billable: Boolean(p.stripePriceMonthlyId || p.stripePriceYearlyId),
        })),
      }}
    />
  );
}
