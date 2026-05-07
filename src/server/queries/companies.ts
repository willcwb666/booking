import "server-only";
import { db } from "@/lib/db";

export async function getUserCompanies(userId: string) {
  return db.companyUser.findMany({
    where: { userId, isActive: true },
    include: {
      company: {
        select: { id: true, name: true, slug: true, businessType: true, isActive: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export async function getCompanyBySlugForUser(slug: string, userId: string) {
  return db.company.findFirst({
    where: {
      slug,
      isActive: true,
      members: { some: { userId, isActive: true } },
    },
    include: {
      plan: {
        select: {
          tier: true,
          displayName: true,
          features: { select: { featureKey: true, enabled: true, limitValue: true } },
        },
      },
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await db.company.findUnique({ where: { slug } });
  return !existing;
}

export async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;
  while (!(await isSlugAvailable(slug))) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }
  return slug;
}
