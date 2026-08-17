import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCompanyBySlugForUser, getUserCompanies } from "@/server/queries/companies";
import { CompanyProvider } from "@/lib/company-context";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { MaintenanceBanner } from "@/components/ui/maintenance-banner";
import { evaluateSubscriptionAccess } from "@/lib/subscription-access";
import { getPlatformSettingsAction } from "@/server/actions/admin-settings";
import { SubscriptionBlock } from "./_components/subscription-block";
import { ModuleGrantPopup } from "@/components/ui/module-grant-popup";
import { getCompanyLicensedModuleCodesAction } from "@/server/actions/admin-modules";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const company = await getCompanyBySlugForUser(companySlug, session.user.id);
  if (!company) notFound();

  const memberRole = company.members?.[0]?.role || "OWNER";

  const [dbUser, userCompanies, licensedModules] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { allowMultiCompany: true },
    }),
    getUserCompanies(session.user.id),
    getCompanyLicensedModuleCodesAction(companySlug),
  ]);

  const hasMultiCompanies = (dbUser?.allowMultiCompany ?? false) || userCompanies.length > 1;

  // Dunning (bloqueio por inadimplência). Super admin nunca é bloqueado.
  const isPlatformAdmin = session.user.role === "admin";
  const { settings } = await getPlatformSettingsAction();
  const access = evaluateSubscriptionAccess({
    subscriptionStatus: (company as any).subscriptionStatus ?? null,
    subscriptionPeriodEnd: (company as any).subscriptionPeriodEnd
      ? new Date((company as any).subscriptionPeriodEnd)
      : null,
    gracePeriodDays: settings.gracePeriodDays,
  });

  // Fora da tolerância → tela de pagamento em tela cheia (sem beco sem saída:
  // a própria tela tem logout, troca de empresa e checkout do Stripe)
  if (!isPlatformAdmin && access.state === "blocked") {
    const plans = await db.plan.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, displayName: true, description: true, priceMonthly: true, priceYearly: true },
    });
    return (
      <SubscriptionBlock
        companySlug={company.slug}
        companyName={company.name}
        overdueSince={access.overdueSince ? access.overdueSince.toLocaleDateString(company.locale) : null}
        currency={company.currency}
        locale={company.locale}
        plans={plans.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          description: p.description ?? "",
          priceMonthly: Number(p.priceMonthly),
          priceYearly: Number(p.priceYearly),
        }))}
      />
    );
  }

  const showGraceBanner = access.state === "grace";
  const showRenewalWarning =
    access.state === "active" &&
    access.daysUntilRenewal !== null &&
    access.daysUntilRenewal >= 0 &&
    access.daysUntilRenewal <= 7;
  const renewalDaysRemaining = access.daysUntilRenewal;

  return (
    <CompanyProvider
      company={{
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl,
        businessType: company.businessType,
        planTier: company.plan.tier,
        planDisplayName: company.plan.displayName,
        subscriptionInterval: company.subscriptionInterval,
        role: memberRole,
        currency: company.currency,
        locale: company.locale,
      }}
    >
      <div className="app-shell">
        <AppSidebar
          userName={session.user.name}
          multiCompany={hasMultiCompanies}
          licensedModules={licensedModules}
        />
        <main className="app-main overflow-auto">
          <MaintenanceBanner />
          {/* Vencido, dentro da tolerância: aviso para renovar antes do bloqueio */}
          {showGraceBanner && (
            <div className="bg-red-600 text-white px-6 py-3 text-sm font-semibold flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span>🚫</span>
                <span>
                  Sua assinatura está vencida.
                  {access.daysUntilBlock !== null && access.daysUntilBlock > 0
                    ? ` Regularize em ${access.daysUntilBlock} dia(s) para não perder o acesso ao sistema.`
                    : " Regularize hoje para não perder o acesso ao sistema."}
                </span>
              </div>
              <a
                href={`/${companySlug}/configuracoes`}
                className="bg-white text-red-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-stone-100 transition-colors shrink-0"
              >
                Pagar Agora
              </a>
            </div>
          )}

          {/* Banner de contagem regressiva 7 dias antes do vencimento */}
          {showRenewalWarning && (
            <div className="bg-amber-500 text-stone-950 px-6 py-3 text-sm font-bold flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  {renewalDaysRemaining === 0
                    ? "Sua assinatura renova hoje! Mantenha seus dados de pagamento atualizados."
                    : `Faltam ${renewalDaysRemaining} dia(s) para a renovação do seu plano. Mantenha os dados de pagamento em dia.`}
                </span>
              </div>
              <a
                href={`/${companySlug}/configuracoes`}
                className="bg-stone-900 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-stone-800 transition-colors shrink-0"
              >
                Gerenciar Assinatura
              </a>
            </div>
          )}

          <div className="flex-1">
            <ModuleGrantPopup />
            {children}
          </div>
        </main>
      </div>
    </CompanyProvider>
  );
}
