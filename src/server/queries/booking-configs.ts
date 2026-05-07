import "server-only";
import { db } from "@/lib/db";

export async function getBookingConfigs(companyId: string) {
  return db.bookingConfig.findMany({
    where: { companyId },
    include: {
      agenda: { select: { id: true, name: true, status: true } },
      serviceTypes: {
        include: {
          serviceType: {
            select: { id: true, name: true, service: { select: { name: true } } },
          },
        },
      },
      extraServices: {
        include: {
          extraService: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBookingConfigById(id: string, companyId: string) {
  return db.bookingConfig.findFirst({
    where: { id, companyId },
    include: {
      agenda: { select: { id: true, name: true, status: true } },
      serviceTypes: {
        include: {
          serviceType: {
            select: {
              id: true,
              name: true,
              service: { select: { id: true, name: true } },
            },
          },
        },
      },
      extraServices: {
        include: {
          extraService: { select: { id: true, name: true } },
        },
      },
    },
  });
}
