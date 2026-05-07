import "server-only";
import { db } from "@/lib/db";

export type FeatureCheck = {
  enabled: boolean;
  limit: number | null;
};

export async function checkFeature(
  companyId: string,
  featureKey: string
): Promise<FeatureCheck> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: {
      plan: {
        select: {
          features: {
            where: { featureKey },
            select: { enabled: true, limitValue: true },
          },
        },
      },
    },
  });

  const feature = company?.plan.features[0];
  if (!feature) return { enabled: false, limit: null };
  return { enabled: feature.enabled, limit: feature.limitValue };
}

export async function requireFeature(
  companyId: string,
  featureKey: string
): Promise<void> {
  const { enabled } = await checkFeature(companyId, featureKey);
  if (!enabled) {
    throw new Error(`Plano atual não inclui: ${featureKey}`);
  }
}
