import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PlanTier } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PLANS = [
  {
    tier: PlanTier.STARTER,
    displayName: "Starter",
    description: "Para quem está começando",
    priceMonthly: 29.9,
    priceYearly: 299.0,
    order: 1,
    features: [
      { featureKey: "max_professionals", featureLabel: "Até 2 profissionais", enabled: true, limitValue: 2 },
      { featureKey: "max_agendas", featureLabel: "1 agenda ativa", enabled: true, limitValue: 1 },
      { featureKey: "extra_services", featureLabel: "Serviços extras", enabled: false, limitValue: null },
      { featureKey: "booking_reminders", featureLabel: "Lembretes de agendamento", enabled: false, limitValue: null },
      { featureKey: "financial_reports", featureLabel: "Relatórios financeiros", enabled: false, limitValue: null },
      { featureKey: "commission_management", featureLabel: "Gestão de comissões", enabled: false, limitValue: null },
      { featureKey: "review_moderation", featureLabel: "Moderação de avaliações", enabled: false, limitValue: null },
      { featureKey: "custom_branding", featureLabel: "Marca personalizada", enabled: false, limitValue: null },
      { featureKey: "advanced_analytics", featureLabel: "Analytics avançados", enabled: false, limitValue: null },
    ],
  },
  {
    tier: PlanTier.NORMAL,
    displayName: "Normal",
    description: "Para negócios em crescimento",
    priceMonthly: 79.9,
    priceYearly: 799.0,
    order: 2,
    features: [
      { featureKey: "max_professionals", featureLabel: "Até 10 profissionais", enabled: true, limitValue: 10 },
      { featureKey: "max_agendas", featureLabel: "Até 5 agendas ativas", enabled: true, limitValue: 5 },
      { featureKey: "extra_services", featureLabel: "Serviços extras", enabled: true, limitValue: null },
      { featureKey: "booking_reminders", featureLabel: "Lembretes de agendamento", enabled: true, limitValue: null },
      { featureKey: "financial_reports", featureLabel: "Relatórios financeiros", enabled: true, limitValue: null },
      { featureKey: "commission_management", featureLabel: "Gestão de comissões", enabled: false, limitValue: null },
      { featureKey: "review_moderation", featureLabel: "Moderação de avaliações", enabled: true, limitValue: null },
      { featureKey: "custom_branding", featureLabel: "Marca personalizada", enabled: false, limitValue: null },
      { featureKey: "advanced_analytics", featureLabel: "Analytics avançados", enabled: false, limitValue: null },
    ],
  },
  {
    tier: PlanTier.ADVANCED,
    displayName: "Advanced",
    description: "Para empresas consolidadas",
    priceMonthly: 149.9,
    priceYearly: 1499.0,
    order: 3,
    features: [
      { featureKey: "max_professionals", featureLabel: "Profissionais ilimitados", enabled: true, limitValue: null },
      { featureKey: "max_agendas", featureLabel: "Agendas ilimitadas", enabled: true, limitValue: null },
      { featureKey: "extra_services", featureLabel: "Serviços extras", enabled: true, limitValue: null },
      { featureKey: "booking_reminders", featureLabel: "Lembretes de agendamento", enabled: true, limitValue: null },
      { featureKey: "financial_reports", featureLabel: "Relatórios financeiros", enabled: true, limitValue: null },
      { featureKey: "commission_management", featureLabel: "Gestão de comissões", enabled: true, limitValue: null },
      { featureKey: "review_moderation", featureLabel: "Moderação de avaliações", enabled: true, limitValue: null },
      { featureKey: "custom_branding", featureLabel: "Marca personalizada", enabled: true, limitValue: null },
      { featureKey: "advanced_analytics", featureLabel: "Analytics avançados", enabled: true, limitValue: null },
    ],
  },
];

async function main() {
  console.log("Seeding plans...");

  for (const { features, ...planData } of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { tier: planData.tier },
      update: planData,
      create: planData,
    });

    for (const feature of features) {
      await prisma.planFeature.upsert({
        where: { planId_featureKey: { planId: plan.id, featureKey: feature.featureKey } },
        update: feature,
        create: { ...feature, planId: plan.id },
      });
    }

    console.log(`  Plan ${planData.tier} OK`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
