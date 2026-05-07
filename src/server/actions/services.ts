"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import {
  serviceSchema,
  serviceTypeSchema,
  extraServiceSchema,
} from "@/schemas/service.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

async function resolveCompany(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const company = await getCompanyBySlugForUser(slug, session.user.id);
  return company ?? null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createServiceAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const count = await db.service.count({ where: { companyId: company.id } });
  await db.service.create({
    data: { ...parsed.data, companyId: company.id, order: count },
  });

  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function updateServiceAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const existing = await db.service.findFirst({
    where: { id, companyId: company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Serviço não encontrado"] } };

  await db.service.update({ where: { id }, data: parsed.data });
  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function deleteServiceAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const existing = await db.service.findFirst({
    where: { id, companyId: company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Serviço não encontrado"] } };

  await db.$transaction([
    db.serviceType.updateMany({
      where: { serviceId: id },
      data: { isActive: false },
    }),
    db.service.update({ where: { id }, data: { isActive: false } }),
  ]);

  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function reorderServiceAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const direction = formData.get("direction") as "up" | "down";
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const items = await db.service.findMany({
    where: { companyId: company.id, isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const idx = items.findIndex((i) => i.id === id);
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || targetIdx < 0 || targetIdx >= items.length)
    return { success: true };

  await db.$transaction([
    db.service.update({
      where: { id: items[idx].id },
      data: { order: items[targetIdx].order },
    }),
    db.service.update({
      where: { id: items[targetIdx].id },
      data: { order: items[idx].order },
    }),
  ]);

  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

// ─── ServiceType ──────────────────────────────────────────────────────────────

export async function createServiceTypeAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const parsed = serviceTypeSchema.safeParse({
    serviceId: formData.get("serviceId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    estimatedMinutes: formData.get("estimatedMinutes"),
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  // Verify the parent service belongs to this company
  const parent = await db.service.findFirst({
    where: { id: parsed.data.serviceId, companyId: company.id, isActive: true },
  });
  if (!parent)
    return { success: false, errors: { _: ["Serviço pai não encontrado"] } };

  const count = await db.serviceType.count({
    where: { serviceId: parsed.data.serviceId },
  });
  await db.serviceType.create({
    data: { ...parsed.data, companyId: company.id, order: count },
  });

  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function updateServiceTypeAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const parsed = serviceTypeSchema.safeParse({
    serviceId: formData.get("serviceId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    estimatedMinutes: formData.get("estimatedMinutes"),
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const existing = await db.serviceType.findFirst({
    where: { id, companyId: company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Tipo não encontrado"] } };

  await db.serviceType.update({ where: { id }, data: parsed.data });
  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function deleteServiceTypeAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const existing = await db.serviceType.findFirst({
    where: { id, companyId: company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Tipo não encontrado"] } };

  await db.serviceType.update({ where: { id }, data: { isActive: false } });
  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function reorderServiceTypeAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const serviceId = formData.get("serviceId") as string;
  const direction = formData.get("direction") as "up" | "down";
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const items = await db.serviceType.findMany({
    where: { serviceId, companyId: company.id, isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const idx = items.findIndex((i) => i.id === id);
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || targetIdx < 0 || targetIdx >= items.length)
    return { success: true };

  await db.$transaction([
    db.serviceType.update({
      where: { id: items[idx].id },
      data: { order: items[targetIdx].order },
    }),
    db.serviceType.update({
      where: { id: items[targetIdx].id },
      data: { order: items[idx].order },
    }),
  ]);

  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

// ─── ExtraService ─────────────────────────────────────────────────────────────

export async function createExtraServiceAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const parsed = extraServiceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    estimatedMinutes: formData.get("estimatedMinutes"),
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const count = await db.extraService.count({ where: { companyId: company.id } });
  await db.extraService.create({
    data: { ...parsed.data, companyId: company.id, order: count },
  });

  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function updateExtraServiceAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const parsed = extraServiceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    estimatedMinutes: formData.get("estimatedMinutes"),
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  const existing = await db.extraService.findFirst({
    where: { id, companyId: company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Extra não encontrado"] } };

  await db.extraService.update({ where: { id }, data: parsed.data });
  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function deleteExtraServiceAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const existing = await db.extraService.findFirst({
    where: { id, companyId: company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Extra não encontrado"] } };

  await db.extraService.update({ where: { id }, data: { isActive: false } });
  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function reorderExtraServiceAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const direction = formData.get("direction") as "up" | "down";
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const items = await db.extraService.findMany({
    where: { companyId: company.id, isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  const idx = items.findIndex((i) => i.id === id);
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || targetIdx < 0 || targetIdx >= items.length)
    return { success: true };

  await db.$transaction([
    db.extraService.update({
      where: { id: items[idx].id },
      data: { order: items[targetIdx].order },
    }),
    db.extraService.update({
      where: { id: items[targetIdx].id },
      data: { order: items[idx].order },
    }),
  ]);

  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}
