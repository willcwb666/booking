import "server-only";
import { db } from "@/lib/db";

export async function getScheduleEvents(
  companyId: string,
  from: string,
  to: string,
  professionalId?: string
) {
  return db.scheduleEvent.findMany({
    where: {
      companyId,
      date: { gte: from, lte: to },
      ...(professionalId ? { professionalId } : {}),
    },
    include: {
      professional: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}
