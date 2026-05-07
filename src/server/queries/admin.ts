import "server-only";
import { db } from "@/lib/db";

export type AdminStats = {
  totalCompanies: number;
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  pendingBookings: number;
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

  const totalRevenue =
    paidBookings.reduce(
      (sum, b) => sum + Math.round(Number(b.estimate.total) * 100),
      0
    ) / 100;

  return { totalCompanies, totalUsers, totalBookings, pendingBookings, totalRevenue };
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

type GetAdminCompaniesOptions = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getAdminCompanies(opts: GetAdminCompaniesOptions = {}) {
  const { search, page = 1, pageSize = 25 } = opts;

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
