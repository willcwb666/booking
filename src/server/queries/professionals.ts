import "server-only";
import { db } from "@/lib/db";

export async function getProfessionals(companyId: string) {
  return db.professional.findMany({
    where: { companyId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function countActiveProfessionals(companyId: string): Promise<number> {
  return db.professional.count({ where: { companyId, isActive: true } });
}
