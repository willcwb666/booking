"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { bookingConfigSchema } from "@/schemas/booking-config.schema";
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

function parseFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    agendaId: formData.get("agendaId"),
    allowPartialService: formData.get("allowPartialService") === "true",
    serviceTypeIds: formData.getAll("serviceTypeIds") as string[],
    extraServiceIds: formData.getAll("extraServiceIds") as string[],
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createBookingConfigAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const ctx = await resolveCompanyWithRole(slug);
  if (!ctx) return { success: false, errors: { _: ["Não autorizado"] } };

  if (ctx.role === "EMPLOYEE")
    return { success: false, errors: { _: ["Sem permissão para criar configurações de booking"] } };

  const intent = formData.get("intent") as "draft" | "publish";
  const raw = parseFormData(formData);
  const parsed = bookingConfigSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const { serviceTypeIds, extraServiceIds, ...configData } = parsed.data;

  // Validate agenda belongs to company
  const agenda = await db.agenda.findFirst({
    where: { id: configData.agendaId, companyId: ctx.company.id },
  });
  if (!agenda)
    return { success: false, errors: { _: ["Agenda não encontrada"] } };
  if (agenda.status === "CANCELLED")
    return { success: false, errors: { _: ["Não é possível usar uma agenda cancelada"] } };

  await db.bookingConfig.create({
    data: {
      ...configData,
      companyId: ctx.company.id,
      createdById: ctx.userId,
      status: intent === "publish" ? "PUBLISHED" : "DRAFT",
      serviceTypes: {
        create: serviceTypeIds.map((id) => ({ serviceTypeId: id })),
      },
      extraServices: {
        create: extraServiceIds.map((id) => ({ extraServiceId: id })),
      },
    },
  });

  revalidatePath(`/${slug}/booking`);
  return { success: true };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateBookingConfigAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const ctx = await resolveCompanyWithRole(slug);
  if (!ctx) return { success: false, errors: { _: ["Não autorizado"] } };

  if (ctx.role === "EMPLOYEE")
    return { success: false, errors: { _: ["Sem permissão para editar configurações de booking"] } };

  const existing = await db.bookingConfig.findFirst({
    where: { id, companyId: ctx.company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Configuração não encontrada"] } };

  const intent = formData.get("intent") as "draft" | "publish";
  const raw = parseFormData(formData);
  const parsed = bookingConfigSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const { serviceTypeIds, extraServiceIds, ...configData } = parsed.data;

  const agenda = await db.agenda.findFirst({
    where: { id: configData.agendaId, companyId: ctx.company.id },
  });
  if (!agenda)
    return { success: false, errors: { _: ["Agenda não encontrada"] } };
  if (agenda.status === "CANCELLED")
    return { success: false, errors: { _: ["Não é possível usar uma agenda cancelada"] } };

  await db.$transaction(async (tx) => {
    await tx.bookingConfigServiceType.deleteMany({ where: { bookingConfigId: id } });
    await tx.bookingConfigExtraService.deleteMany({ where: { bookingConfigId: id } });
    await tx.bookingConfig.update({
      where: { id },
      data: {
        ...configData,
        status: intent === "publish" ? "PUBLISHED" : existing.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        serviceTypes: {
          create: serviceTypeIds.map((stId) => ({ serviceTypeId: stId })),
        },
        extraServices: {
          create: extraServiceIds.map((esId) => ({ extraServiceId: esId })),
        },
      },
    });
  });

  revalidatePath(`/${slug}/booking`);
  return { success: true };
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export async function publishBookingConfigAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const ctx = await resolveCompanyWithRole(slug);
  if (!ctx) return { success: false, errors: { _: ["Não autorizado"] } };

  if (ctx.role === "EMPLOYEE")
    return { success: false, errors: { _: ["Sem permissão"] } };

  const existing = await db.bookingConfig.findFirst({
    where: { id, companyId: ctx.company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Configuração não encontrada"] } };
  if (existing.status !== "DRAFT")
    return { success: false, errors: { _: ["Apenas rascunhos podem ser publicados"] } };

  await db.bookingConfig.update({ where: { id }, data: { status: "PUBLISHED" } });
  revalidatePath(`/${slug}/booking`);
  return { success: true };
}

// ─── Archive (soft-delete) ────────────────────────────────────────────────────

export async function archiveBookingConfigAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const ctx = await resolveCompanyWithRole(slug);
  if (!ctx) return { success: false, errors: { _: ["Não autorizado"] } };

  if (ctx.role !== "OWNER")
    return { success: false, errors: { _: ["Apenas o proprietário pode arquivar configurações"] } };

  const existing = await db.bookingConfig.findFirst({
    where: { id, companyId: ctx.company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Configuração não encontrada"] } };

  // Hard delete — no data loss since booking records aren't created yet (Phase 5)
  await db.bookingConfig.delete({ where: { id } });

  revalidatePath(`/${slug}/booking`);
  return { success: true };
}
