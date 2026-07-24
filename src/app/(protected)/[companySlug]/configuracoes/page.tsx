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

  // Garante a existência de cada coluna individualmente sem quebrar o PostgreSQL
  const cols = [
    `"minCancellationNoticeHours" INT DEFAULT 24`,
    `"cancellationFee" DECIMAL(10, 2) DEFAULT 0`,
    `"lateToleranceMinutes" INT DEFAULT 15`,
    `"notifyEmailEnabled" BOOLEAN DEFAULT true`,
    `"notifyTextEnabled" BOOLEAN DEFAULT true`,
    `"notifySmsEnabled" BOOLEAN DEFAULT false`,
    `"notifyWhatsappEnabled" BOOLEAN DEFAULT true`,
    `"heroTitle" TEXT`,
    `"heroSubtitle" TEXT`,
    `"brandColor" TEXT DEFAULT '#0f172a'`,
    `"coverImageUrl" TEXT`,
    `"socialInstagram" TEXT`,
    `"socialWhatsapp" TEXT`,
    `"socialFacebook" TEXT`,
  ];

  for (const col of cols) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "company" ADD COLUMN IF NOT EXISTS ${col};`);
    } catch {
      // ignora erro individual de DDL
    }
  }

  // Busca dados adicionais da empresa com fallback seguro contra erros de banco
  let extraData: any = null;
  try {
    const compExtra = await db.$queryRawUnsafe<Array<any>>(
      `SELECT "minCancellationNoticeHours", "cancellationFee", "lateToleranceMinutes", "notifyEmailEnabled", "notifyTextEnabled", "notifySmsEnabled", "notifyWhatsappEnabled", "heroTitle", "heroSubtitle", "brandColor", "coverImageUrl", "socialInstagram", "socialWhatsapp", "socialFacebook" FROM "company" WHERE id = '${company.id}' LIMIT 1`
    );
    extraData = compExtra[0] || null;
  } catch (err) {
    console.error("[ConfiguracoesPage] Fallback para colunas extras:", err);
  }

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
    db.bookingConfig.findMany({
      where: { companyId: company.id, status: "PUBLISHED" },
      select: { id: true, name: true },
    }),
  ]);

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
        minCancellationNoticeHours: Number(extraData?.minCancellationNoticeHours ?? 24),
        cancellationFee: Number(extraData?.cancellationFee ?? 0),
        lateToleranceMinutes: Number(extraData?.lateToleranceMinutes ?? 15),
        notifyEmailEnabled: extraData?.notifyEmailEnabled ?? true,
        notifyTextEnabled: extraData?.notifyTextEnabled ?? true,
        notifySmsEnabled: extraData?.notifySmsEnabled ?? false,
        notifyWhatsappEnabled: extraData?.notifyWhatsappEnabled ?? true,
      }}
      initialLanding={{
        heroTitle: extraData?.heroTitle ?? "",
        heroSubtitle: extraData?.heroSubtitle ?? "",
        brandColor: extraData?.brandColor ?? "#0f172a",
        coverImageUrl: extraData?.coverImageUrl ?? "",
        socialInstagram: extraData?.socialInstagram ?? "",
        socialWhatsapp: extraData?.socialWhatsapp ?? "",
        socialFacebook: extraData?.socialFacebook ?? "",
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
