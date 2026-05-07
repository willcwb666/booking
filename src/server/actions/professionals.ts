"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { db } from "@/lib/db";
import { professionalSchema } from "@/schemas/professional.schema";
import { checkFeature } from "@/lib/features";
import { countActiveProfessionals } from "@/server/queries/professionals";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

async function resolveCompany(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const company = await getCompanyBySlugForUser(slug, session.user.id);
  return company ?? null;
}

export async function createProfessionalAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  // Feature flag: max_professionals
  const feature = await checkFeature(company.id, "max_professionals");
  if (!feature.enabled)
    return {
      success: false,
      errors: { _: ["Seu plano não inclui profissionais"] },
    };
  if (feature.limit !== null) {
    const current = await countActiveProfessionals(company.id);
    if (current >= feature.limit)
      return {
        success: false,
        errors: {
          _: [
            `Limite de ${feature.limit} profissional(is) atingido no plano atual`,
          ],
        },
      };
  }

  const parsed = professionalSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    bio: formData.get("bio") || undefined,
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  await db.professional.create({
    data: {
      companyId: company.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      bio: parsed.data.bio || null,
    },
  });

  revalidatePath(`/${slug}/profissionais`);
  return { success: true };
}

export async function updateProfessionalAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const existing = await db.professional.findFirst({
    where: { id, companyId: company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Profissional não encontrado"] } };

  const parsed = professionalSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    bio: formData.get("bio") || undefined,
  });
  if (!parsed.success)
    return { success: false, errors: parsed.error.flatten().fieldErrors };

  await db.professional.update({
    where: { id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      bio: parsed.data.bio || null,
    },
  });

  revalidatePath(`/${slug}/profissionais`);
  return { success: true };
}

export async function deleteProfessionalAction(
  formData: FormData
): Promise<ActionResult> {
  const slug = formData.get("companySlug") as string;
  const id = formData.get("id") as string;
  const company = await resolveCompany(slug);
  if (!company) return { success: false, errors: { _: ["Não autorizado"] } };

  const existing = await db.professional.findFirst({
    where: { id, companyId: company.id },
  });
  if (!existing)
    return { success: false, errors: { _: ["Profissional não encontrado"] } };

  await db.professional.update({ where: { id }, data: { isActive: false } });
  revalidatePath(`/${slug}/profissionais`);
  return { success: true };
}
