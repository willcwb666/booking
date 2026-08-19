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
        <main className="app-main overflow-auto flex-1 flex flex-col">
          {/* ── Top Command Bar ── */}
          <header className="h-14 bg-[var(--color-bg)] border-b border-[var(--color-border)] px-6 flex items-center justify-between shrink-0 shadow-2xs z-20">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider hidden sm:inline">
                Ambiente: <span className="text-[var(--color-text-heading)] font-semibold">{company.name}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[var(--text-2xs)] font-bold bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success-border)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse"></span>
                <span>Online</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href={`/${company.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-muted)] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-bold transition-colors"
                title="Abrir página pública do estabelecimento"
              >
                <span>Vitrine Pública</span>
                <span className="text-[var(--text-2xs)]">↗</span>
              </a>

              <a
                href={`/book/${company.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn-tactile inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-control)] bg-[var(--color-navy)] hover:bg-[var(--color-navy)] text-white text-xs font-bold shadow-xs transition-colors"
                title="Abrir link de agendamento do cliente"
              >
                <span>Link de Agendamento</span>
                <span className="text-[var(--text-2xs)]">↗</span>
              </a>
            </div>
          </header>

          <MaintenanceBanner />
          {/* Vencido, dentro da tolerância: aviso para renovar antes do bloqueio */}
          {showGraceBanner && (
            <div className="bg-[var(--color-danger)] text-white px-6 py-3 text-sm font-semibold flex items-center justify-between shadow-md">
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
                className="bg-[var(--color-bg)] text-[var(--color-danger)] px-3 py-1 rounded-[var(--radius-control)] text-xs font-bold hover:bg-[var(--color-bg-muted)] transition-colors shrink-0"
              >
                Pagar Agora
              </a>
            </div>
          )}

          {/* Banner de contagem regressiva 7 dias antes do vencimento */}
          {showRenewalWarning && (
            <div className="bg-[var(--color-warning)] text-[var(--color-text-heading)] px-6 py-3 text-sm font-bold flex items-center justify-between shadow-md">
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
                className="bg-[var(--color-navy)] text-white px-3 py-1 rounded-[var(--radius-control)] text-xs font-bold hover:bg-[var(--color-navy)] transition-colors shrink-0"
              >
                Gerenciar Assinatura
              </a>
            </div>
          )}

          {/*
            Coluna flexível: telas de altura fixa (a agenda) podem usar
            `flex-1 min-h-0` e rolar internamente, em vez de chutar `h-screen`
            e estourar a viewport pela altura deste cabeçalho e dos banners.
          */}
          <div className="flex-1 flex flex-col min-h-0">
            <ModuleGrantPopup />
            {children}
          </div>
        </main>
      </div>
    </CompanyProvider>
  );
}
