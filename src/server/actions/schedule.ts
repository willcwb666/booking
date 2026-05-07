"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { scheduleEventSchema } from "@/schemas/schedule-event.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import type { CompanyUserRole } from "@/generated/prisma/client";

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

export async function createScheduleEventAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const ctx = await resolveCompanyWithRole(slug);
  if (!ctx) return { success: false, errors: { _: ["Não autorizado"] } };

  const raw = {
    title: formData.get("title"),
    type: formData.get("type"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    professionalId: (formData.get("professionalId") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = scheduleEventSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const { professionalId, ...data } = parsed.data;

  // EMPLOYEE can only create events for themselves
  if (ctx.role === "EMPLOYEE") {
    const selfProfessional = await db.professional.findFirst({
      where: { companyId: ctx.company.id, userId: ctx.userId, isActive: true },
    });
    if (!selfProfessional)
      return {
        success: false,
        errors: { _: ["Sem permissão para criar eventos"] },
      };
    // Force their own professionalId
    await db.scheduleEvent.create({
      data: {
        ...data,
        professionalId: selfProfessional.id,
        companyId: ctx.company.id,
        createdById: ctx.userId,
      },
    });
  } else {
    // Validate professionalId belongs to company (if provided)
    if (professionalId) {
      const prof = await db.professional.findFirst({
        where: { id: professionalId, companyId: ctx.company.id },
      });
      if (!prof)
        return { success: false, errors: { _: ["Profissional não encontrado"] } };
    }

    await db.scheduleEvent.create({
      data: {
        ...data,
        professionalId: professionalId ?? null,
        companyId: ctx.company.id,
        createdById: ctx.userId,
      },
    });
  }

  revalidatePath(`/${slug}/schedule`);
  return { success: true };
}

export async function deleteScheduleEventAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const ctx = await resolveCompanyWithRole(slug);
  if (!ctx) return { success: false, errors: { _: ["Não autorizado"] } };

  const event = await db.scheduleEvent.findFirst({
    where: { id, companyId: ctx.company.id },
  });
  if (!event)
    return { success: false, errors: { _: ["Evento não encontrado"] } };

  // EMPLOYEE can only delete their own events
  if (ctx.role === "EMPLOYEE" && event.createdById !== ctx.userId)
    return {
      success: false,
      errors: { _: ["Sem permissão para excluir este evento"] },
    };

  await db.scheduleEvent.delete({ where: { id } });

  revalidatePath(`/${slug}/schedule`);
  return { success: true };
}
