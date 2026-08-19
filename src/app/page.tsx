import { db } from "@/lib/db";
import { PLATFORM_BILLING_CURRENCY } from "@/lib/stripe-billing";
import LandingClient, { LandingPlan } from "./landing-client";

const DEFAULT_PLANS: LandingPlan[] = [
  {
    id: "starter",
    tier: "starter",
    displayName: "Iniciante",
    description: "Para profissionais autônomos que estão começando.",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "1 Empresa com Perfil & Logo",
      "Até 30 Agendamentos/mês",
      "Link Público de Agendamento",
      "Confirmação por WhatsApp",
    ],
  },
  {
    id: "pro",
    tier: "pro",
    displayName: "Profissional",
    description: "Para estabelecimentos e prestadores com alta demanda.",
    priceMonthly: 49,
    priceYearly: 468,
    features: [
      "Agendamentos Ilimitados",
      "Serviços Extras (Upsell)",
      "Promoções com Tempo Limite",
      "Orçamentos por WhatsApp em 1 Toque",
      "Lembretes Automáticos",
      "Mapas e Rotas Integrados",
    ],
  },
  {
    id: "multi",
    tier: "multi",
    displayName: "Multi-Equipe",
    description: "Para empresas com múltiplos atendentes e unidades.",
    priceMonthly: 99,
    priceYearly: 948,
    features: [
      "Tudo do Plano Profissional",
      "Múltiplos Atendentes & Agendas",
      "Gestão de Comissões por Membro",
      "Portal Self-Service do Cliente",
      "Suporte Prioritário VIP (15 min)",
    ],
  },
];

export default async function HomePage() {
  let plans: LandingPlan[] = DEFAULT_PLANS;

  try {
    const dbPlans = await db.plan.findMany({
      where: { isActive: true },
      include: {
        features: {
          where: { enabled: true },
          orderBy: { featureKey: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    if (dbPlans && dbPlans.length > 0) {
      plans = dbPlans.map((p) => ({
        id: p.id,
        tier: p.tier,
        displayName: p.displayName,
        description: p.description ?? "",
        priceMonthly: Number(p.priceMonthly),
        priceYearly: Number(p.priceYearly),
        features: p.features.map((f) => f.featureLabel),
      }));
    }
  } catch (err) {
    console.warn("[HomePage] Não foi possível carregar os planos do banco. Usando planos padrão.", err);
  }

  return (
    <LandingClient
      billingCurrency={PLATFORM_BILLING_CURRENCY || "BRL"}
      plans={plans}
    />
  );
}
