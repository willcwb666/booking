import { db } from "@/lib/db";
import { PLATFORM_BILLING_CURRENCY } from "@/lib/stripe-billing";
import LandingClient from "./landing-client";

export default async function HomePage() {
  const plans = await db.plan.findMany({
    where: { isActive: true },
    include: { features: { where: { enabled: true }, orderBy: { featureKey: "asc" } } },
    orderBy: { order: "asc" },
  });

  return (
    <LandingClient
      billingCurrency={PLATFORM_BILLING_CURRENCY}
      plans={plans.map((p) => ({
        id: p.id,
        tier: p.tier,
        displayName: p.displayName,
        description: p.description ?? "",
        priceMonthly: Number(p.priceMonthly),
        priceYearly: Number(p.priceYearly),
        features: p.features.map((f) => f.featureLabel),
      }))}
    />
  );
}
