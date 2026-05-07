import "server-only";
import { db } from "@/lib/db";

export async function getPlans() {
  return db.plan.findMany({
    where: { isActive: true },
    include: { features: { orderBy: { featureKey: "asc" } } },
    orderBy: { order: "asc" },
  });
}

export type PlansWithFeatures = Awaited<ReturnType<typeof getPlans>>;
