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
  customerPhone: string | null;
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
        customerDetail: { select: { firstName: true, lastName: true, email: true, phone: true } },
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
    customerPhone: b.customerDetail?.phone ?? null,
    professionalName: b.professional?.name ?? null,
    estimateTotal: b.estimate?.total.toString() ?? "0",
    serviceLabels: (b.estimate?.serviceTypes ?? []).map(
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
      paymentConfirmedBy: { select: { name: true } },
      companyPaymentMethod: { select: { label: true, kind: true } },
      review: { select: { rating: true, comment: true, reviewerName: true } },
    },
  });
}

export type BookingDashboardStats = {
  todayCount: number;
  pendingCount: number;
  monthRevenue: number;
  upcomingWeekCount: number;
  /**
   * Agendamentos por dia, de hoje até +6 dias. Real, vindo do banco.
   * O dashboard antes desenhava esta série com percentuais fixos no código
   * (40, 65, 50, 80, 100…) — o dono do salão lia "sexta é meu dia mais forte"
   * de uma constante. Gráfico com número inventado é pior que gráfico nenhum,
   * porque alguém escala equipe com base nele.
   */
  next7Days: Array<{ date: string; count: number }>;
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

  // Janela do gráfico: hoje + 6 dias
  const windowDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    windowDates.push(
      new Date(now.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    );
  }

  const [todayCount, pendingCount, paidThisMonth, upcomingWeekCount, weekRows] =
    await Promise.all([
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
    // Uma agregação no banco em vez de 7 contagens separadas
    db.booking.groupBy({
      by: ["scheduledDate"],
      where: {
        companyId,
        scheduledDate: { in: windowDates },
        status: { not: "CANCELLED" },
      },
      _count: { _all: true },
    }),
  ]);

  const monthRevenue =
    paidThisMonth.reduce(
      (sum, b) => sum + Math.round(Number(b.estimate?.total ?? 0) * 100),
      0
    ) / 100;

  // Dias sem agendamento precisam aparecer como zero, não sumir do gráfico —
  // um vazio de terça é informação tão útil quanto um pico de sexta.
  const countByDate = new Map(
    weekRows.map((r) => [r.scheduledDate, r._count._all])
  );
  const next7Days = windowDates.map((date) => ({
    date,
    count: countByDate.get(date) ?? 0,
  }));

  return { todayCount, pendingCount, monthRevenue, upcomingWeekCount, next7Days };
}

// ─── Portal do cliente ────────────────────────────────────────────────────────

export type CustomerPortalBooking = {
  id: string;
  serviceName: string;
  professionalName: string | null;
  scheduledDate: string;
  scheduledStartTime: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  total: number;
};

/**
 * Agendamentos do usuário logado NESTA empresa.
 *
 * A posse é resolvida de duas formas, e a segunda é deliberadamente restrita:
 *  1. o agendamento nasceu de um orçamento criado por este usuário; ou
 *  2. o e-mail do contato do agendamento é o mesmo do usuário — mas SÓ com
 *     e-mail verificado. Sem essa condição, bastaria criar conta com o e-mail
 *     de outra pessoa para ler a agenda dela.
 */
export async function getCustomerPortalBookings(input: {
  companyId: string;
  userId: string;
  email: string;
  emailVerified: boolean;
}): Promise<CustomerPortalBooking[]> {
  const estimates = await db.estimate.findMany({
    where: { customerId: input.userId, companyId: input.companyId },
    select: { id: true },
  });

  const ownership: object[] = [{ estimateId: { in: estimates.map((e) => e.id) } }];
  if (input.emailVerified) {
    ownership.push({ customerDetail: { email: input.email } });
  }

  const bookings = await db.booking.findMany({
    where: { companyId: input.companyId, OR: ownership },
    orderBy: [{ scheduledDate: "desc" }, { scheduledStartTime: "desc" }],
    take: 50,
    include: {
      bookingConfig: { select: { name: true } },
      professional: { select: { name: true } },
      estimate: { select: { total: true } },
    },
  });

  return bookings.map((b) => ({
    id: b.id,
    serviceName: b.bookingConfig.name,
    professionalName: b.professional?.name ?? null,
    scheduledDate: b.scheduledDate,
    scheduledStartTime: b.scheduledStartTime,
    status: b.status,
    paymentStatus: b.paymentStatus,
    total: Number(b.estimate?.total ?? 0),
  }));
}
