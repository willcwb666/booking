"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { agendaSchema } from "@/schemas/agenda.schema";
import { invalidateSlotCache } from "@/lib/agenda";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { CompanyUserRole } from "@/generated/prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveCompanyWithRole(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const company = await getCompanyBySlugForUser(slug, session.user.id);
  if (!company) return null;
  return {
    company,
    userId: session.user.id,
    role: company.members[0].role as CompanyUserRole,
  };
}

function parseFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    workingDays: formData.getAll("workingDays"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    intervalMinutes: formData.get("intervalMinutes"),
    professionalIds: formData.getAll("professionalIds") as string[],
  };
}

// Checks for scheduling conflicts with existing ACTIVE agendas
async function detectConflict(
  companyId: string,
  data: {
    startDate: string;
    endDate?: string | null;
    workingDays: number[];
    startTime: string;
    endTime: string;
    professionalIds: string[];
  },
  excludeAgendaId?: string
): Promise<string | null> {
  const activeAgendas = await db.agenda.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      ...(excludeAgendaId ? { id: { not: excludeAgendaId } } : {}),
    },
    include: { professionals: { select: { professionalId: true } } },
  });

  for (const existing of activeAgendas) {
    // Date range overlap: [s1, e1] overlaps [s2, e2] when s1 <= e2 AND s2 <= e1
    const e1 = existing.endDate ?? "9999-12-31";
    const e2 = data.endDate ?? "9999-12-31";
    const datesOverlap =
      existing.startDate <= e2 && data.startDate <= e1;
    if (!datesOverlap) continue;

    // Time overlap: NOT (end1 <= start2 OR end2 <= start1)
    const timesOverlap =
      !(existing.endTime <= data.startTime || data.endTime <= existing.startTime);
    if (!timesOverlap) continue;

    // Working days overlap
    const daysOverlap = existing.workingDays.some((d: number) =>
      data.workingDays.includes(d)
    );
    if (!daysOverlap) continue;

    // Professional overlap
    const existingProfIds = existing.professionals.map((p: { professionalId: string }) => p.professionalId);
    const profsOverlap = data.professionalIds.some((id) =>
      existingProfIds.includes(id)
    );
    if (!profsOverlap) continue;

    return `Conflito com agenda "${existing.name}": mesmo horário, dias e profissional(is) em comum.`;
  }

  return null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createAgendaAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const ctx = await resolveCompanyWithRole(slug);
  if (!ctx) return { success: false, errors: { _: ["Não autorizado"] } };

  if (ctx.role === "EMPLOYEE")
    return { success: false, errors: { _: ["Sem permissão para criar agendas"] } };

  const intent = formData.get("intent") as "draft" | "publish";
  const raw = parseFormData(formData);
  const parsed = agendaSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const { professionalIds, endDate, ...agendaData } = parsed.data;

  if (intent === "publish") {
    const conflict = await detectConflict(ctx.company.id, {
      ...agendaData,
      endDate: endDate || null,
      professionalIds,
    });
    if (conflict) return { success: false, errors: { _: [conflict] } };
  }

  await db.agenda.create({
    data: {
      ...agendaData,
      endDate: endDate || null,
      companyId: ctx.company.id,
      createdById: ctx.userId,
      status: intent === "publish" ? "ACTIVE" : "DRAFT",
      professionals: {
        create: professionalIds.map((id) => ({ professionalId: id })),
      },
    },
  });

  revalidatePath(`/${slug}/agendas`);
  return { success: true };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateAgendaAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const ctx = await resolveCompanyWithRole(slug);
  if (!ctx) return { success: false, errors: { _: ["Não autorizado"] } };

  if (ctx.role === "EMPLOYEE")
    return { success: false, errors: { _: ["Sem permissão para editar agendas"] } };

  const existing = await db.agenda.findFirst({
    where: { id, companyId: ctx.company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Agenda não encontrada"] } };
  if (existing.status === "CANCELLED")
    return { success: false, errors: { _: ["Não é possível editar agenda cancelada"] } };

  const intent = formData.get("intent") as "draft" | "publish";
  const raw = parseFormData(formData);
  const parsed = agendaSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const { professionalIds, endDate, ...agendaData } = parsed.data;

  if (intent === "publish" || existing.status === "ACTIVE") {
    const conflict = await detectConflict(
      ctx.company.id,
      { ...agendaData, endDate: endDate || null, professionalIds },
      id
    );
    if (conflict) return { success: false, errors: { _: [conflict] } };
  }

  await db.$transaction(async (tx) => {
    await tx.agendaProfessional.deleteMany({ where: { agendaId: id } });
    await tx.agenda.update({
      where: { id },
      data: {
        ...agendaData,
        endDate: endDate || null,
        status: intent === "publish" ? "ACTIVE" : existing.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
        professionals: {
          create: professionalIds.map((pid) => ({ professionalId: pid })),
        },
      },
    });
  });

  await invalidateSlotCache(id);
  revalidatePath(`/${slug}/agendas`);
  return { success: true };
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export async function publishAgendaAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const ctx = await resolveCompanyWithRole(slug);
  if (!ctx) return { success: false, errors: { _: ["Não autorizado"] } };

  if (ctx.role === "EMPLOYEE")
    return { success: false, errors: { _: ["Sem permissão"] } };

  const existing = await db.agenda.findFirst({
    where: { id, companyId: ctx.company.id },
    include: { professionals: { select: { professionalId: true } } },
  });
  if (!existing)
    return { success: false, errors: { _: ["Agenda não encontrada"] } };
  if (existing.status !== "DRAFT")
    return { success: false, errors: { _: ["Apenas agendas em rascunho podem ser publicadas"] } };

  const conflict = await detectConflict(ctx.company.id, {
    startDate: existing.startDate,
    endDate: existing.endDate,
    workingDays: existing.workingDays,
    startTime: existing.startTime,
    endTime: existing.endTime,
    professionalIds: existing.professionals.map((p: { professionalId: string }) => p.professionalId),
  });
  if (conflict) return { success: false, errors: { _: [conflict] } };

  await db.agenda.update({ where: { id }, data: { status: "ACTIVE" } });
  revalidatePath(`/${slug}/agendas`);
  return { success: true };
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelAgendaAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const reason = (formData.get("reason") as string) || null;
  const ctx = await resolveCompanyWithRole(slug);
  if (!ctx) return { success: false, errors: { _: ["Não autorizado"] } };

  // Only OWNER can cancel
  if (ctx.role !== "OWNER")
    return { success: false, errors: { _: ["Apenas o proprietário pode cancelar agendas"] } };

  const existing = await db.agenda.findFirst({
    where: { id, companyId: ctx.company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Agenda não encontrada"] } };
  if (existing.status === "CANCELLED")
    return { success: false, errors: { _: ["Agenda já está cancelada"] } };

  await db.agenda.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledById: ctx.userId,
      cancellationReason: reason,
    },
  });

  await invalidateSlotCache(id);
  revalidatePath(`/${slug}/agendas`);
  return { success: true };
}
