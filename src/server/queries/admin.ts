import "server-only";
import { db } from "@/lib/db";

export type AdminStats = {
  totalCompanies: number;
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  pendingBookings: number;
  mrr: number;
  arr: number;
  activeSubscriptionsCount: number;
  overdueSubscriptionsCount: number;
  arpu: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const [totalCompanies, totalUsers, totalBookings, pendingBookings, paidBookings] =
    await Promise.all([
      db.company.count(),
      db.user.count(),
      db.booking.count(),
      db.booking.count({ where: { status: "PENDING" } }),
      db.booking.findMany({
        where: { paymentStatus: "PAID" },
        include: { estimate: { select: { total: true } } },
      }),
    ]);

  let companiesWithPlans: Array<{
    subscriptionStatus: string | null;
    subscriptionInterval: string | null;
    priceMonthly: number;
    priceYearly: number;
  }> = [];

  try {
    const rawComps = await db.company.findMany({
      where: { isActive: true },
      select: {
        subscriptionStatus: true,
        subscriptionInterval: true,
        plan: { select: { priceMonthly: true, priceYearly: true } },
      },
    });
    companiesWithPlans = rawComps.map((c) => ({
      subscriptionStatus: c.subscriptionStatus,
      subscriptionInterval: c.subscriptionInterval,
      priceMonthly: Number(c.plan?.priceMonthly ?? 0),
      priceYearly: Number(c.plan?.priceYearly ?? 0),
    }));
  } catch {
    const rawRows = await db.$queryRawUnsafe<Array<{
      subscriptionStatus: string | null;
      subscriptionInterval: string | null;
      priceMonthly: number | string | null;
      priceYearly: number | string | null;
    }>>(`
      SELECT c."subscriptionStatus", c."subscriptionInterval", p."priceMonthly", p."priceYearly"
      FROM "company" c
      LEFT JOIN "plan" p ON p.id = c."planId"
      WHERE c."isActive" = true
    `);
    companiesWithPlans = rawRows.map((c) => ({
      subscriptionStatus: c.subscriptionStatus,
      subscriptionInterval: c.subscriptionInterval,
      priceMonthly: Number(c.priceMonthly || 0),
      priceYearly: Number(c.priceYearly || 0),
    }));
  }

  const totalRevenue =
    paidBookings.reduce(
      (sum, b) => sum + Math.round(Number(b.estimate?.total ?? 0) * 100),
      0
    ) / 100;

  let mrr = 0;
  let activeSubscriptionsCount = 0;
  let overdueSubscriptionsCount = 0;

  for (const comp of companiesWithPlans) {
    const status = comp.subscriptionStatus;
    if (status === "past_due" || status === "unpaid") {
      overdueSubscriptionsCount++;
    } else {
      activeSubscriptionsCount++;
      const priceMonthly = comp.priceMonthly;
      const priceYearly = comp.priceYearly;
      if (comp.subscriptionInterval === "year" && priceYearly > 0) {
        mrr += priceYearly / 12;
      } else {
        mrr += priceMonthly;
      }
    }
  }

  const arr = mrr * 12;
  const arpu = activeSubscriptionsCount > 0 ? mrr / activeSubscriptionsCount : 0;

  return {
    totalCompanies,
    totalUsers,
    totalBookings,
    pendingBookings,
    totalRevenue,
    mrr,
    arr,
    activeSubscriptionsCount,
    overdueSubscriptionsCount,
    arpu,
  };
}

export type AdminCompanyItem = {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  isActive: boolean;
  planName: string;
  memberCount: number;
  bookingCount: number;
  createdAt: Date;
};

export type CompanySelectorItem = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

/** Busca todas as empresas ativas para o seletor de ambiente do super admin */
export async function getCompaniesForSelector(): Promise<CompanySelectorItem[]> {
  const rows = await db.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, logoUrl: true },
  });
  return rows;
}

type GetAdminCompaniesOptions = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getAdminCompanies(opts: GetAdminCompaniesOptions = {}) {
  const { search, page = 1, pageSize = 25 } = opts;

  try {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      db.company.count({ where }),
      db.company.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          plan: { select: { displayName: true } },
          _count: { select: { members: true, bookings: true } },
        },
      }),
    ]);

    const items: AdminCompanyItem[] = rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      businessType: c.businessType,
      isActive: c.isActive,
      planName: c.plan.displayName,
      memberCount: c._count.members,
      bookingCount: c._count.bookings,
      createdAt: c.createdAt,
    }));

    return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
  } catch (err) {
    let whereClause = "";
    if (search) {
      const s = search.replace(/'/g, "''");
      whereClause = `WHERE c.name ILIKE '%${s}%' OR c.slug ILIKE '%${s}%'`;
    }

    const countRows = await db.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*)::int as count FROM "company" c ${whereClause}`
    );
    const total = Number(countRows[0]?.count || 0);

    const offset = (page - 1) * pageSize;
    const sql = `
      SELECT 
        c.id, c.name, c.slug, c."businessType", c."isActive", c."createdAt",
        p."displayName" as "planName",
        (SELECT COUNT(*)::int FROM "company_user" cu WHERE cu."companyId" = c.id) as "memberCount",
        (SELECT COUNT(*)::int FROM "booking" b WHERE b."companyId" = c.id) as "bookingCount"
      FROM "company" c
      LEFT JOIN "plan" p ON p.id = c."planId"
      ${whereClause}
      ORDER BY c."createdAt" DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    const rawRows = await db.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      slug: string;
      businessType: string;
      isActive: boolean;
      planName: string;
      memberCount: number;
      bookingCount: number;
      createdAt: Date;
    }>>(sql);

    const items: AdminCompanyItem[] = rawRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      businessType: c.businessType,
      isActive: c.isActive,
      planName: c.planName || "—",
      memberCount: Number(c.memberCount || 0),
      bookingCount: Number(c.bookingCount || 0),
      createdAt: c.createdAt,
    }));

    return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
  }
}

export type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  companyCount: number;
  createdAt: Date;
};

type GetAdminUsersOptions = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getAdminUsers(opts: GetAdminUsersOptions = {}) {
  const { search, page = 1, pageSize = 25 } = opts;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { companyUsers: true } },
      },
    }),
  ]);

  const items: AdminUserItem[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? null,
    banned: u.banned ?? false,
    banReason: u.banReason ?? null,
    companyCount: u._count.companyUsers,
    createdAt: u.createdAt,
  }));

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export type AdminFinanceCompanyItem = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  businessType: string;
  ownerName: string;
  ownerEmail: string;
  planName: string;
  planMonthlyPrice: number;
  planYearlyPrice: number;
  subscriptionStatus: string | null;
  subscriptionInterval: string | null;
  subscriptionPeriodEnd: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
};

export async function getAdminFinanceData(): Promise<AdminFinanceCompanyItem[]> {
  try {
    const companies = await db.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        plan: true,
        members: {
          where: { role: "OWNER" },
          select: { user: { select: { name: true, email: true } } },
          take: 1,
        },
      },
    });

    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: c.logoUrl,
      businessType: c.businessType,
      ownerName: c.members[0]?.user.name ?? "Sem dono",
      ownerEmail: c.members[0]?.user.email ?? "—",
      planName: c.plan?.displayName ?? "—",
      planMonthlyPrice: Number(c.plan?.priceMonthly ?? 0),
      planYearlyPrice: Number(c.plan?.priceYearly ?? 0),
      subscriptionStatus: c.subscriptionStatus,
      subscriptionInterval: c.subscriptionInterval,
      subscriptionPeriodEnd: c.subscriptionPeriodEnd,
      stripeCustomerId: c.stripeCustomerId,
      stripeSubscriptionId: c.stripeSubscriptionId,
      createdAt: c.createdAt,
    }));
  } catch {
    const sql = `
      SELECT 
        c.id, c.name, c.slug, c."logoUrl", c."businessType", 
        c."subscriptionStatus", c."subscriptionInterval", c."subscriptionPeriodEnd",
        c."stripeCustomerId", c."stripeSubscriptionId", c."createdAt",
        p."displayName" as "planName", p."priceMonthly", p."priceYearly",
        u.name as "ownerName", u.email as "ownerEmail"
      FROM "company" c
      LEFT JOIN "plan" p ON p.id = c."planId"
      LEFT JOIN "company_user" cu ON cu."companyId" = c.id AND cu.role = 'OWNER'
      LEFT JOIN "user" u ON u.id = cu."userId"
      ORDER BY c."createdAt" DESC
    `;

    const rawRows = await db.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      businessType: string;
      subscriptionStatus: string | null;
      subscriptionInterval: string | null;
      subscriptionPeriodEnd: Date | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      createdAt: Date;
      planName: string | null;
      priceMonthly: number | string | null;
      priceYearly: number | string | null;
      ownerName: string | null;
      ownerEmail: string | null;
    }>>(sql);

    return rawRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: c.logoUrl,
      businessType: c.businessType,
      ownerName: c.ownerName || "Sem dono",
      ownerEmail: c.ownerEmail || "—",
      planName: c.planName || "—",
      planMonthlyPrice: Number(c.priceMonthly || 0),
      planYearlyPrice: Number(c.priceYearly || 0),
      subscriptionStatus: c.subscriptionStatus,
      subscriptionInterval: c.subscriptionInterval,
      subscriptionPeriodEnd: c.subscriptionPeriodEnd,
      stripeCustomerId: c.stripeCustomerId,
      stripeSubscriptionId: c.stripeSubscriptionId,
      createdAt: c.createdAt,
    }));
  }
}
