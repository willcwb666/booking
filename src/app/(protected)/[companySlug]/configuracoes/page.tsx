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

  const memberRole = company.members?.[0]?.role ?? (session?.user?.role === "admin" ? "OWNER" : "EMPLOYEE");
  const canEdit = memberRole === "OWNER" || memberRole === "MANAGER" || session?.user?.role === "admin";
  const isOwner = memberRole === "OWNER" || session?.user?.role === "admin";

  const [paymentMethods, fullCompany, availablePlans, availableServices] = await Promise.all([
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
    }),
    db.plan.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: {
        id: true,
        displayName: true,
        description: true,
        priceMonthly: true,
        priceYearly: true,
        stripePriceMonthlyId: true,
        stripePriceYearlyId: true,
      },
    }),
    db.bookingConfig.findMany({
      where: { companyId: company.id, status: "PUBLISHED" },
      select: { id: true, name: true },
    }),
  ]);

  const depositSettings = await db.companyPaymentSettings.findUnique({
    where: { companyId: company.id },
    select: { requireDeposit: true, depositPercentage: true, dynamicDeposit: true },
  });

  return (
    <SettingsClient
      companySlug={companySlug}
      canEdit={canEdit}
      availableServices={availableServices}
      initial={{
        name: company.name,
        phone: company.phone ?? "",
        address: company.address ?? "",
        country: (company as any).country || "BR",
        timezone: company.timezone,
        currency: company.currency,
        locale: company.locale,
        logoUrl: company.logoUrl,
        minCancellationNoticeHours: fullCompany?.minCancellationNoticeHours ?? 24,
        cancellationFee: Number(fullCompany?.cancellationFee ?? 0),
        lateToleranceMinutes: fullCompany?.lateToleranceMinutes ?? 15,
        maxAllowedNoShows: fullCompany?.maxAllowedNoShows ?? 2,
        requireDeposit: depositSettings?.requireDeposit ?? false,
        depositPercentage: depositSettings?.depositPercentage ?? 30,
        dynamicDeposit: depositSettings?.dynamicDeposit ?? false,
        notifyEmailEnabled: fullCompany?.notifyEmailEnabled ?? true,
        notifyTextEnabled: fullCompany?.notifyTextEnabled ?? true,
        notifySmsEnabled: fullCompany?.notifySmsEnabled ?? false,
        notifyWhatsappEnabled: fullCompany?.notifyWhatsappEnabled ?? true,
      }}
      initialLanding={{
        heroTitle: fullCompany?.heroTitle ?? "",
        heroSubtitle: fullCompany?.heroSubtitle ?? "",
        brandColor: fullCompany?.brandColor ?? "#0f172a",
        coverImageUrl: fullCompany?.coverImageUrl ?? "",
        socialInstagram: fullCompany?.socialInstagram ?? "",
        googleReviewUrl: fullCompany?.googleReviewUrl ?? "",
        socialWhatsapp: fullCompany?.socialWhatsapp ?? "",
        socialFacebook: fullCompany?.socialFacebook ?? "",
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
