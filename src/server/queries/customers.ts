import "server-only";
import { db } from "@/lib/db";

export type CustomerSummary = {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowCount?: number;
  totalSpent: number;
  lastBookingDate: string | null;
};

export async function getCompanyCustomers(companyId: string, search?: string): Promise<CustomerSummary[]> {
  // 1. Tenta buscar da tabela Customer dedicada (indexada e de alta performance)
  const customers = await db.customer.findMany({
    where: {
      companyId,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  if (customers.length > 0) {
    return customers.map((c) => ({
      id: c.id,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      city: c.city ?? "",
      totalBookings: c.totalBookings,
      completedBookings: c.completedBookings,
      cancelledBookings: c.cancelledBookings,
      noShowCount: c.noShowCount,
      totalSpent: Number(c.totalSpent),
      lastBookingDate: c.lastBookingDate,
    }));
  }

  // 2. Fallback com agrupamento inteligente para bases de dados legadas
  const details = await db.bookingCustomerDetail.findMany({
    where: {
      booking: { companyId },
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      city: true,
      booking: {
        select: {
          id: true,
          scheduledDate: true,
          status: true,
          paymentStatus: true,
          estimate: {
            select: { total: true },
          },
        },
      },
    },
  });

  const customerMap = new Map<string, CustomerSummary>();

  for (const d of details) {
    const key = d.email.toLowerCase().trim();
    const existing = customerMap.get(key);

    const bStatus = d.booking.status;
    const isCompleted = bStatus === "COMPLETED";
    const isCancelled = bStatus === "CANCELLED";
    const isNoShow = bStatus === "NO_SHOW";
    const amount = d.booking.paymentStatus === "PAID" ? Number(d.booking.estimate?.total ?? 0) : 0;
    const bDate = d.booking.scheduledDate;

    if (!existing) {
      customerMap.set(key, {
        email: d.email,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        city: d.city,
        totalBookings: 1,
        completedBookings: isCompleted ? 1 : 0,
        cancelledBookings: isCancelled ? 1 : 0,
        noShowCount: isNoShow ? 1 : 0,
        totalSpent: amount,
        lastBookingDate: bDate,
      });
    } else {
      existing.totalBookings += 1;
      if (isCompleted) existing.completedBookings += 1;
      if (isCancelled) existing.cancelledBookings += 1;
      if (isNoShow) existing.noShowCount = (existing.noShowCount ?? 0) + 1;
      existing.totalSpent += amount;
      if (!existing.lastBookingDate || bDate > existing.lastBookingDate) {
        existing.lastBookingDate = bDate;
      }
    }
  }

  return Array.from(customerMap.values()).sort(
    (a, b) => (b.lastBookingDate ?? "").localeCompare(a.lastBookingDate ?? "")
  );
}
