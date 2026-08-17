import "server-only";
import { db } from "@/lib/db";

export async function getUserCompanies(userId: string) {
  // 1. Tentar ver se o usuário é admin da plataforma
  let isPlatformAdmin = false;
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    isPlatformAdmin = user?.role === "admin";
  } catch {
    // ignora erro de checagem de role
  }

  if (isPlatformAdmin) {
    try {
      const allCompanies = await db.$queryRawUnsafe<Array<{
        id: string;
        name: string;
        slug: string;
        logoUrl: string | null;
        businessType: string;
        isActive: boolean;
      }>>(`SELECT id, name, slug, "logoUrl", "businessType", "isActive" FROM "company" ORDER BY "createdAt" DESC`);

      if (allCompanies.length > 0) {
        return allCompanies.map((c) => ({
          id: c.id,
          company: {
            id: c.id,
            name: c.name,
            slug: c.slug,
            logoUrl: c.logoUrl,
            businessType: c.businessType,
            isActive: c.isActive ?? true,
          },
        }));
      }
    } catch (e) {
      console.error("Erro ao buscar empresas para admin:", e);
    }
  }

  // 2. Tentar buscar empresas onde o usuário é membro ativo
  try {
    const rows = await db.$queryRawUnsafe<Array<{
      cu_id: string;
      c_id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      businessType: string;
      c_isActive: boolean;
      role: string;
    }>>(
      `
      SELECT 
        cu.id as cu_id, c.id as c_id, c.name, c.slug, c."logoUrl", c."businessType", c."isActive" as c_isActive, cu.role
      FROM "company_user" cu
      JOIN "company" c ON c.id = cu."companyId"
      WHERE cu."userId" = $1
      ORDER BY cu."joinedAt" ASC
    `,
      userId
    );

    if (rows.length > 0) {
      return rows.map((r) => ({
        id: r.cu_id,
        company: {
          id: r.c_id,
          name: r.name,
          slug: r.slug,
          logoUrl: r.logoUrl,
          businessType: r.businessType,
          isActive: r.c_isActive ?? true,
        },
      }));
    }
  } catch (e) {
    console.error("Erro ao buscar por company_user:", e);
  }

  // 3. FALLBACK DE SEGURANÇA SUPREMO: Se nada acima retornou e existem empresas no banco, traz todas para o usuário poder selecionar
  try {
    const fallbackCompanies = await db.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      businessType: string;
      isActive: boolean;
    }>>(`SELECT id, name, slug, "logoUrl", "businessType", "isActive" FROM "company" ORDER BY "createdAt" DESC`);

    return fallbackCompanies.map((c) => ({
      id: c.id,
      company: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        logoUrl: c.logoUrl,
        businessType: c.businessType,
        isActive: c.isActive ?? true,
      },
    }));
  } catch (e) {
    console.error("Erro no fallback supremo:", e);
    return [];
  }
}

export async function getCompanyBySlugForUser(slug: string, userId: string) {
  // Admin da plataforma tem acesso a qualquer empresa (como OWNER)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const isPlatformAdmin = user?.role === "admin";

  try {
    const company = await db.company.findFirst({
      where: {
        slug,
        isActive: true,
        ...(isPlatformAdmin ? {} : { members: { some: { userId, isActive: true } } }),
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

    if (company && isPlatformAdmin && company.members.length === 0) {
      company.members = [{ role: "OWNER" as any }];
    }

    return company;
  } catch (err) {
    // Fallback resiliente via SQL bruto parametrizado
    const compRows = await db.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      slug: string;
      businessType: string;
      planId: string;
      logoUrl: string | null;
      phone: string | null;
      address: string | null;
      isActive: boolean;
      currency: string;
      timezone: string;
      locale: string;
      subscriptionInterval: string | null;
      subscriptionStatus: string | null;
      subscriptionPeriodEnd: Date | null;
    }>>(`SELECT * FROM "company" WHERE slug = $1 AND "isActive" = true LIMIT 1`, slug);

    if (compRows.length === 0) return null;
    const rawComp = compRows[0];

    const memberRows = await db.$queryRawUnsafe<Array<{ role: string }>>(
      `SELECT role FROM "company_user" WHERE "companyId" = $1 AND "userId" = $2 AND "isActive" = true`,
      rawComp.id,
      userId
    );

    if (!isPlatformAdmin && memberRows.length === 0) {
      return null;
    }

    const plan = await db.plan.findUnique({
      where: { id: rawComp.planId },
      select: {
        tier: true,
        displayName: true,
        features: { select: { featureKey: true, enabled: true, limitValue: true } },
      },
    });
    // Toda empresa tem plano — sem ele o registro está inconsistente
    if (!plan) return null;

    return {
      ...rawComp,
      plan,
      members: memberRows.length > 0 ? memberRows : (isPlatformAdmin ? [{ role: "OWNER" as any }] : []),
    };
  }
}

export async function isSlugAvailable(slug: string): Promise<boolean> {
  try {
    const existing = await db.company.findUnique({ where: { slug } });
    return !existing;
  } catch {
    const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "company" WHERE slug = $1 LIMIT 1`, slug);
    return rows.length === 0;
  }
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

export async function getCompanyBySlug(slug: string) {
  return db.company.findFirst({
    where: { slug, isActive: true },
  });
}

