import "server-only";
import { db } from "@/lib/db";
import type { AgendaStatus } from "@/generated/prisma/client";

export async function getAgendas(
  companyId: string,
  filters: {
    statuses?: AgendaStatus[];
    from?: string;
    to?: string;
    professionalId?: string;
  } = {}
) {
  return db.agenda.findMany({
    where: {
      companyId,
      ...(filters.statuses?.length ? { status: { in: filters.statuses } } : {}),
      ...(filters.from ? { startDate: { gte: filters.from } } : {}),
      ...(filters.to ? { startDate: { lte: filters.to } } : {}),
      ...(filters.professionalId
        ? {
            professionals: {
              some: { professionalId: filters.professionalId },
            },
          }
        : {}),
    },
    include: {
      professionals: {
        include: {
          professional: { select: { id: true, name: true } },
        },
      },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
  });
}

export async function getAgendaById(id: string, companyId: string) {
  return db.agenda.findFirst({
    where: { id, companyId },
    include: {
      professionals: {
        include: {
          professional: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getActiveAgendas(companyId: string) {
  return db.agenda.findMany({
    where: { companyId, status: "ACTIVE" },
    include: {
      professionals: { select: { professionalId: true } },
    },
    orderBy: { startDate: "asc" },
  });
}
