import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
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

  const role = company.members[0].role;
  const canEdit = role === "OWNER" || role === "MANAGER";

  const paymentSettings = await db.companyPaymentSettings.findUnique({
    where: { companyId: company.id },
  });

  return (
    <SettingsClient
      companySlug={companySlug}
      canEdit={canEdit}
      initial={{
        name: company.name,
        phone: company.phone ?? "",
        address: company.address ?? "",
      }}
      bookingBaseUrl={`/book/${companySlug}`}
      paymentSettings={{
        enableCard: paymentSettings?.enableCard ?? true,
        enableCashCheck: paymentSettings?.enableCashCheck ?? true,
        enablePix: paymentSettings?.enablePix ?? false,
        pixKey: paymentSettings?.pixKey ?? "",
        pixKeyType: paymentSettings?.pixKeyType ?? "",
      }}
    />
  );
}
