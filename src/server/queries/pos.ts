import "server-only";
import { db } from "@/lib/db";

export type PosBookingOption = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  serviceName: string;
  servicePrice: number;
  scheduledTime: string;
  professionalId: string | null;
  professionalName: string | null;
  status: string;
};

export type PosSaleItemData = {
  id: string;
  type: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productId: string | null;
};

export type PosSaleSummary = {
  id: string;
  customerName: string | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: string;
  status: string;
  commissionAmount: number;
  itemsCount: number;
  createdAt: string;
  items: PosSaleItemData[];
};

export type PosDashboardStats = {
  todaySalesTotal: number;
  todaySalesCount: number;
  todayProductsTotal: number;
  todayServicesTotal: number;
  todayCommissionsTotal: number;
};

/** Busca agendamentos do dia para carregar como comanda no POS */
export async function getOpenBookingsForPos(
  companySlug: string,
  dateStr?: string
): Promise<PosBookingOption[]> {
  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return [];

  const targetDate = dateStr || new Date().toISOString().split("T")[0];

  const bookings = await db.booking.findMany({
    where: {
      companyId: company.id,
      scheduledDate: targetDate,
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: { scheduledStartTime: "asc" },
    include: {
      bookingConfig: { select: { name: true } },
      estimate: { select: { total: true } },
      customerDetail: { select: { firstName: true, lastName: true, email: true, phone: true } },
      professional: { select: { id: true, name: true } },
    },
  });

  return bookings.map((b) => ({
    id: b.id,
    clientName: b.customerDetail ? `${b.customerDetail.firstName} ${b.customerDetail.lastName}` : "Cliente",
    clientEmail: b.customerDetail?.email || "",
    clientPhone: b.customerDetail?.phone || null,
    serviceName: b.bookingConfig.name,
    servicePrice: Number(b.estimate?.total || 0),
    scheduledTime: b.scheduledStartTime,
    professionalId: b.professional?.id || null,
    professionalName: b.professional?.name || null,
    status: b.status,
  }));
}

/** Busca estatísticas de vendas do dia no POS */
export async function getPosStats(companySlug: string): Promise<PosDashboardStats> {
  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) {
    return {
      todaySalesTotal: 0,
      todaySalesCount: 0,
      todayProductsTotal: 0,
      todayServicesTotal: 0,
      todayCommissionsTotal: 0,
    };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sales = await db.posSale.findMany({
    where: {
      companyId: company.id,
      createdAt: { gte: startOfDay },
      status: "COMPLETED",
    },
    include: {
      items: true,
    },
  });

  let salesTotal = 0;
  let productsTotal = 0;
  let servicesTotal = 0;
  let commissionsTotal = 0;

  for (const s of sales) {
    salesTotal += Number(s.total);
    commissionsTotal += Number(s.commissionAmount);
    for (const it of s.items) {
      if (it.type === "PRODUCT") {
        productsTotal += Number(it.totalPrice);
      } else {
        servicesTotal += Number(it.totalPrice);
      }
    }
  }

  return {
    todaySalesTotal: salesTotal,
    todaySalesCount: sales.length,
    todayProductsTotal: productsTotal,
    todayServicesTotal: servicesTotal,
    todayCommissionsTotal: commissionsTotal,
  };
}

/** Lista vendas recentes do POS com paginação */
export async function getRecentPosSales(
  companySlug: string,
  opts: { page?: number; pageSize?: number } = {}
): Promise<{ items: PosSaleSummary[]; total: number; page: number; pageSize: number; pageCount: number }> {
  const { page = 1, pageSize = 10 } = opts;

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return { items: [], total: 0, page, pageSize, pageCount: 0 };

  const where = { companyId: company.id };

  const [total, rows] = await Promise.all([
    db.posSale.count({ where }),
    db.posSale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  const items: PosSaleSummary[] = rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    subtotal: Number(r.subtotal),
    discountAmount: Number(r.discountAmount),
    total: Number(r.total),
    paymentMethod: r.paymentMethod,
    status: r.status,
    commissionAmount: Number(r.commissionAmount),
    itemsCount: r._count.items,
    createdAt: r.createdAt.toISOString(),
    items: r.items.map((it) => ({
      id: it.id,
      type: it.type,
      name: it.name,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.totalPrice),
      productId: it.productId,
    })),
  }));

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}
