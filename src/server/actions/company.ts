"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCompanySchema, generateSlug, isReservedSlug } from "@/schemas/company.schema";
import { ensureUniqueSlug } from "@/server/queries/companies";
import type { ActionResult } from "@/types";

export async function createCompanyAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, errors: { _: ["Não autenticado"] } };

  const alreadyHas = await db.companyUser.findFirst({
    where: { userId: session.user.id, isActive: true },
  });
  if (alreadyHas) redirect(`/onboarding`);

  const raw = {
    name: formData.get("name"),
    businessType: formData.get("businessType"),
    planId: formData.get("planId"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
  };

  const parsed = createCompanySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const base = generateSlug(parsed.data.name);

  if (isReservedSlug(base)) {
    return { success: false, errors: { name: ["Esse nome não pode ser usado como endereço"] } };
  }

  const slug = await ensureUniqueSlug(base);

  const company = await db.company.create({
    data: {
      name: parsed.data.name,
      slug,
      businessType: parsed.data.businessType as never,
      planId: parsed.data.planId,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      members: {
        create: { userId: session.user.id, role: "OWNER", isActive: true },
      },
    },
  });

  redirect(`/${company.slug}/dashboard`);
}

export async function updateCompanyAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, errors: { _: ["Não autenticado"] } };

  const companySlug = formData.get("companySlug") as string;

  const member = await db.companyUser.findFirst({
    where: {
      userId: session.user.id,
      company: { slug: companySlug },
      isActive: true,
      role: { in: ["OWNER", "MANAGER"] },
    },
    include: { company: { select: { id: true } } },
  });
  if (!member) return { success: false, errors: { _: ["Acesso negado"] } };

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;

  if (!name || name.length < 2) {
    return { success: false, errors: { name: ["Nome muito curto"] } };
  }

  await db.company.update({
    where: { id: member.company.id },
    data: { name, phone, address },
  });

  return { success: true };
}
