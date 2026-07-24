"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncPlanWithStripe } from "@/lib/stripe-billing";
import type { ActionResult } from "@/types";

async function requireAdmin(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.role === "admin";
}

const planSchema = z.object({
  displayName: z.string().min(1, "Nome obrigatório").max(60, "Máximo 60 caracteres"),
  description: z.string().max(200, "Máximo 200 caracteres").optional(),
  priceMonthly: z.coerce.number({ error: "Preço inválido" }).min(0, "Deve ser positivo"),
  priceYearly: z.coerce.number({ error: "Preço inválido" }).min(0, "Deve ser positivo"),
  isActive: z.boolean().default(true),
  order: z.coerce.number().int().min(0).default(0),
});

export async function updatePlanAction(formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, errors: { _: ["Acesso negado"] } };

  const id = formData.get("id") as string;
  const parsed = planSchema.safeParse({
    displayName: formData.get("displayName"),
    description: formData.get("description") || undefined,
    priceMonthly: formData.get("priceMonthly"),
    priceYearly: formData.get("priceYearly"),
    isActive: formData.get("isActive") === "on",
    order: formData.get("order") ?? 0,
  });
  if (!parsed.success) return { success: false, errors: parsed.error.flatten().fieldErrors };

  const existing = await db.plan.findUnique({ where: { id } });
  if (!existing) return { success: false, errors: { _: ["Plano não encontrado"] } };

  // 1. Salva os dados do plano
  const updated = await db.plan.update({
    where: { id },
    data: {
      displayName: parsed.data.displayName,
      description: parsed.data.description ?? null,
      priceMonthly: parsed.data.priceMonthly.toFixed(2),
      priceYearly: parsed.data.priceYearly.toFixed(2),
      isActive: parsed.data.isActive,
      order: parsed.data.order,
    },
  });

  // 2. Sincroniza com o Stripe (só quando há preço > 0 — plano grátis não cobra)
  if (parsed.data.priceMonthly > 0 || parsed.data.priceYearly > 0) {
    try {
      const ids = await syncPlanWithStripe(updated);
      await db.plan.update({ where: { id }, data: ids });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao sincronizar com o Stripe";
      // O plano foi salvo no banco; só a sincronização falhou
      return { success: false, errors: { _: [`Plano salvo, mas a sincronização com o Stripe falhou: ${msg}`] } };
    }
  }

  revalidatePath("/admin/plans");
  revalidatePath("/", "layout");
  return { success: true };
}

/** Cria/atualiza uma feature (item de bullet) do plano. */
export async function upsertPlanFeatureAction(formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, errors: { _: ["Acesso negado"] } };

  const planId = formData.get("planId") as string;
  const featureKey = (formData.get("featureKey") as string)?.trim();
  const featureLabel = (formData.get("featureLabel") as string)?.trim();
  const enabled = formData.get("enabled") === "on";

  if (!planId || !featureLabel) return { success: false, errors: { _: ["Dados inválidos"] } };
  const key = featureKey || featureLabel.toLowerCase().replace(/\s+/g, "_").slice(0, 40);

  await db.planFeature.upsert({
    where: { planId_featureKey: { planId, featureKey: key } },
    update: { featureLabel, enabled },
    create: { planId, featureKey: key, featureLabel, enabled },
  });

  revalidatePath("/admin/plans");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deletePlanFeatureAction(formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, errors: { _: ["Acesso negado"] } };

  const id = formData.get("id") as string;
  await db.planFeature.delete({ where: { id } });

  revalidatePath("/admin/plans");
  revalidatePath("/", "layout");
  return { success: true };
}
