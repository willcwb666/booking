import { db } from "@/lib/db";
import { PlansClient } from "./plans-client";

export default async function AdminPlansPage() {
  const plans = await db.plan.findMany({
    include: { features: { orderBy: { featureKey: "asc" } } },
    orderBy: { order: "asc" },
  });

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <PlansClient
      stripeConfigured={stripeConfigured}
      plans={plans.map((p) => ({
        id: p.id,
        tier: p.tier,
        displayName: p.displayName,
        description: p.description ?? "",
        priceMonthly: Number(p.priceMonthly),
        priceYearly: Number(p.priceYearly),
        isActive: p.isActive,
        order: p.order,
        syncedWithStripe: Boolean(p.stripePriceMonthlyId),
        features: p.features.map((f) => ({
          id: f.id,
          featureKey: f.featureKey,
          featureLabel: f.featureLabel,
          enabled: f.enabled,
        })),
      }))}
    />
  );
}
