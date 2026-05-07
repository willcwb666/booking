import "server-only";
import { db } from "@/lib/db";
import type { BookingStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/client";

export type BookingListItem = {
  id: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerName: string | null;
  customerEmail: string | null;
  professionalName: string | null;
  estimateTotal: string;
  serviceLabels: string[];
  createdAt: Date;
};

type GetBookingsFilters = {
  companyId: string;
  status?: BookingStatus | "ALL";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getBookings(filters: GetBookingsFilters) {
  const { companyId, status, dateFrom, dateTo, search, page = 1, pageSize = 20 } = filters;

  const where = {
    companyId,
    ...(status && status !== "ALL" ? { status } : {}),
    ...(dateFrom || dateTo
      ? {
          scheduledDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { customerDetail: { firstName: { contains: search, mode: "insensitive" as const } } },
            { customerDetail: { lastName: { contains: search, mode: "insensitive" as const } } },
            { customerDetail: { email: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      orderBy: [{ scheduledDate: "desc" }, { scheduledStartTime: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        customerDetail: { select: { firstName: true, lastName: true, email: true } },
        professional: { select: { name: true } },
        estimate: {
          select: {
            total: true,
            serviceTypes: {
              include: {
                serviceType: { select: { name: true, service: { select: { name: true } } } },
              },
            },
          },
        },
      },
    }),
  ]);

  const items: BookingListItem[] = rows.map((b) => ({
    id: b.id,
    scheduledDate: b.scheduledDate,
    scheduledStartTime: b.scheduledStartTime,
    scheduledEndTime: b.scheduledEndTime,
    status: b.status,
    paymentMethod: b.paymentMethod,
    paymentStatus: b.paymentStatus,
    customerName: b.customerDetail
      ? `${b.customerDetail.firstName} ${b.customerDetail.lastName}`
      : null,
    customerEmail: b.customerDetail?.email ?? null,
    professionalName: b.professional?.name ?? null,
    estimateTotal: b.estimate.total.toString(),
    serviceLabels: b.estimate.serviceTypes.map(
      (s) => `${s.serviceType.service.name} — ${s.serviceType.name}`
    ),
    createdAt: b.createdAt,
  }));

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getBookingDetail(companyId: string, bookingId: string) {
  return db.booking.findFirst({
    where: { id: bookingId, companyId },
    include: {
      bookingConfig: { select: { name: true } },
      estimate: {
        include: {
          serviceTypes: {
            include: {
              serviceType: { select: { name: true, service: { select: { name: true } } } },
            },
          },
          extraServices: {
            include: { extraService: { select: { name: true } } },
          },
        },
      },
      customerDetail: true,
      homeAccess: {
        select: { accessType: true, keepKeyWithProvider: true, additionalNote: true },
      },
      professional: { select: { id: true, name: true } },
      cancelledBy: { select: { name: true } },
      review: { select: { rating: true, comment: true, reviewerName: true } },
    },
  });
}

export type BookingDashboardStats = {
  todayCount: number;
  pendingCount: number;
  monthRevenue: number;
  upcomingWeekCount: number;
};

export async function getBookingDashboardStats(
  companyId: string
): Promise<BookingDashboardStats> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [todayCount, pendingCount, paidThisMonth, upcomingWeekCount] = await Promise.all([
    db.booking.count({
      where: { companyId, scheduledDate: today, status: { not: "CANCELLED" } },
    }),
    db.booking.count({
      where: { companyId, status: "PENDING" },
    }),
    db.booking.findMany({
      where: {
        companyId,
        paymentStatus: "PAID",
        scheduledDate: { gte: monthStart },
      },
      include: { estimate: { select: { total: true } } },
    }),
    db.booking.count({
      where: {
        companyId,
        scheduledDate: { gte: today, lte: weekLater },
        status: { not: "CANCELLED" },
      },
    }),
  ]);

  const monthRevenue =
    paidThisMonth.reduce(
      (sum, b) => sum + Math.round(Number(b.estimate.total) * 100),
      0
    ) / 100;

  return { todayCount, pendingCount, monthRevenue, upcomingWeekCount };
}
