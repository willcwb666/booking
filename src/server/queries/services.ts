import "server-only";
import { db } from "@/lib/db";

export async function getServices(companyId: string) {
  return db.service.findMany({
    where: { companyId, isActive: true },
    include: {
      serviceTypes: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });
}

export async function getExtraServices(companyId: string) {
  return db.extraService.findMany({
    where: { companyId, isActive: true },
    orderBy: { order: "asc" },
  });
}
