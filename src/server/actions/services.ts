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

export async function createFullServiceAction(formData: FormData): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { success: false, errors: { name: ["Nome do serviço é obrigatório"] } };

  const description = ((formData.get("description") as string) || "").trim() || null;
  const price = parseFloat(formData.get("price") as string) || 0;
  const estimatedMinutes = parseInt(formData.get("estimatedMinutes") as string) || 30;
  const category = (formData.get("category") as string) || "DEFAULT";
  const icon = (formData.get("icon") as string) || (category === "EXTRA" ? "sparkles" : "scissors");

  if (category === "EXTRA") {
    const count = await db.extraService.count({ where: { companyId: company.id } });
    await db.extraService.create({
      data: {
        companyId: company.id,
        name,
        description,
        price,
        estimatedMinutes,
        icon,
        isActive: true,
        order: count,
      },
    });
  } else {
    const count = await db.service.count({ where: { companyId: company.id } });
    const service = await db.service.create({
      data: {
        companyId: company.id,
        name,
        description,
        icon,
        order: count,
        isActive: true,
      },
    });

    await db.serviceType.create({
      data: {
        companyId: company.id,
        serviceId: service.id,
        name: "Atendimento Padrão",
        description,
        price,
        estimatedMinutes,
        order: 0,
        isActive: true,
      },
    });
  }

  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function getServiceByIdAction(companySlug: string, id: string) {
  const company = await resolveCompany(companySlug);
  if (!company) return null;

  const srv = await db.service.findFirst({
    where: { id, companyId: company.id },
    include: { serviceTypes: { take: 1 } },
  });

  if (srv) {
    const st = srv.serviceTypes[0];
    return {
      id: srv.id,
      name: srv.name,
      description: srv.description || null,
      price: st ? Number(st.price) : 0,
      estimatedMinutes: st ? st.estimatedMinutes : 30,
      category: "DEFAULT" as const,
      icon: srv.icon || "scissors",
      isActive: Boolean(srv.isActive),
    };
  }

  const extra = await db.extraService.findFirst({
    where: { id, companyId: company.id },
  });

  if (extra) {
    return {
      id: extra.id,
      name: extra.name,
      description: extra.description || null,
      price: Number(extra.price),
      estimatedMinutes: Number(extra.estimatedMinutes),
      category: "EXTRA" as const,
      icon: extra.icon || "sparkles",
      isActive: Boolean(extra.isActive),
    };
  }

  return null;
}

export async function updateFullServiceAction(formData: FormData): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return { success: false, errors: { name: ["Nome do serviço é obrigatório"] } };

  const description = ((formData.get("description") as string) || "").trim() || null;
  const price = parseFloat(formData.get("price") as string) || 0;
  const estimatedMinutes = parseInt(formData.get("estimatedMinutes") as string) || 30;
  const icon = (formData.get("icon") as string) || "scissors";

  const existingExtra = await db.extraService.findFirst({ where: { id, companyId: company.id } });
  if (existingExtra) {
    await db.extraService.update({
      where: { id },
      data: {
        name,
        description,
        price,
        estimatedMinutes,
        icon,
      },
    });
  } else {
    await db.service.update({
      where: { id },
      data: {
        name,
        description,
        icon,
      },
    });

    const st = await db.serviceType.findFirst({ where: { serviceId: id, companyId: company.id } });
    if (st) {
      await db.serviceType.update({
        where: { id: st.id },
        data: { price, estimatedMinutes, description },
      });
    }
  }

  revalidatePath(`/${slug}/servicos`);
  return { success: true };
}

export async function toggleDisableServiceAction(companySlug: string, id: string): Promise<ActionResult> {
  const company = await resolveCompany(companySlug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const extra = await db.extraService.findFirst({ where: { id, companyId: company.id } });
  if (extra) {
    await db.extraService.update({
      where: { id },
      data: { isActive: !extra.isActive },
    });
  } else {
    const srv = await db.service.findFirst({ where: { id, companyId: company.id } });
    if (srv) {
      await db.service.update({
        where: { id },
        data: { isActive: !srv.isActive },
      });
    }
  }

  revalidatePath(`/${companySlug}/servicos`);
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
    allowQuantity: formData.get("allowQuantity") === "on",
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

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
    allowQuantity: formData.get("allowQuantity") === "on",
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
    allowQuantity: formData.get("allowQuantity") === "on",
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
    allowQuantity: formData.get("allowQuantity") === "on",
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
