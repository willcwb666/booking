"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { syncPlanWithStripe } from "@/lib/stripe-billing";
import type { PlanTier } from "@/generated/prisma/client";
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
});

export async function createPlanAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return { success: false, error: "Acesso negado" };

  const displayName = (formData.get("displayName") as string)?.trim();
  const tier = (formData.get("tier") as string)?.trim().toLowerCase() || displayName.toLowerCase().replace(/\s+/g, "_");
  const description = (formData.get("description") as string)?.trim() || "";
  const priceMonthly = parseFloat(formData.get("priceMonthly") as string) || 0;
  const priceYearly = parseFloat(formData.get("priceYearly") as string) || 0;
  const isActive = formData.get("isActive") === "on";

  if (!displayName) return { success: false, error: "Preencha o nome do plano." };

  try {
    const existing = await db.plan.findUnique({ where: { tier: tier as PlanTier } });
    if (existing) {
      return { success: false, error: `Já existe um plano cadastrado com o código '${tier}'.` };
    }

    const created = await db.plan.create({
      data: {
        tier: tier as PlanTier,
        displayName,
        description,
        priceMonthly: priceMonthly.toFixed(2),
        priceYearly: priceYearly.toFixed(2),
        isActive,
        order: 99,
      },
    });

    if (priceMonthly > 0 || priceYearly > 0) {
      try {
        const ids = await syncPlanWithStripe(created);
        await db.plan.update({ where: { id: created.id }, data: ids });
      } catch (err) {
        console.error("Erro na sincronização inicial do Stripe:", err);
      }
    }

    revalidatePath("/admin/plans");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Erro ao criar plano:", err);
    return { success: false, error: "Falha ao cadastrar o novo plano." };
  }
}

export async function updatePlanAction(formData: FormData): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, errors: { _: ["Acesso negado"] } };

  const id = formData.get("id") as string;
  const parsed = planSchema.safeParse({
    displayName: formData.get("displayName"),
    description: formData.get("description") || undefined,
    priceMonthly: formData.get("priceMonthly"),
    priceYearly: formData.get("priceYearly"),
    isActive: formData.get("isActive") === "on",
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
    },
  });

  // 2. Sincroniza com o Stripe
  if (parsed.data.priceMonthly > 0 || parsed.data.priceYearly > 0) {
    try {
      const ids = await syncPlanWithStripe(updated);
      await db.plan.update({ where: { id }, data: ids });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao sincronizar com o Stripe";
      return { success: false, errors: { _: [`Plano salvo, mas a sincronização com o Stripe falhou: ${msg}`] } };
    }
  }

  revalidatePath("/admin/plans");
  revalidatePath("/", "layout");
  return { success: true };
}

/** Reordena os planos no banco via Drag-and-Drop (Array de IDs em ordem). */
export async function reorderPlansAction(orderedPlanIds: string[]) {
  if (!(await requireAdmin())) return { success: false, error: "Acesso negado" };

  try {
    for (let index = 0; index < orderedPlanIds.length; index++) {
      await db.plan.update({
        where: { id: orderedPlanIds[index] },
        data: { order: index },
      });
    }

    revalidatePath("/admin/plans");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Erro ao reordenar planos:", err);
    return { success: false, error: "Falha ao salvar nova ordem dos planos." };
  }
}

/** Define o plano 'Destaque / Mais Popular' garantindo que apenas 1 esteja marcado no banco. */
export async function setPopularPlanAction(popularPlanId: string) {
  if (!(await requireAdmin())) return { success: false, error: "Acesso negado" };

  try {
    // Garante coluna no banco
    await db.$executeRawUnsafe(`
      ALTER TABLE "plan" ADD COLUMN IF NOT EXISTS "isPopular" BOOLEAN NOT NULL DEFAULT false;
    `);

    // Reseta todos para false
    await db.$executeRawUnsafe(`UPDATE "plan" SET "isPopular" = false`);

    // Define apenas o plano selecionado para true
    await db.$executeRawUnsafe(
      `UPDATE "plan" SET "isPopular" = true WHERE id = $1`,
      popularPlanId
    );

    revalidatePath("/admin/plans");
    revalidatePath("/", "layout");
    return { success: true, message: "Plano definido como Destaque / Mais Popular!" };
  } catch (err) {
    console.error("Erro ao definir plano popular:", err);
    return { success: false, error: "Falha ao definir destaque do plano." };
  }
}

export async function deletePlanAction(planId: string) {
  if (!(await requireAdmin())) return { success: false, error: "Acesso negado" };

  try {
    await db.plan.delete({ where: { id: planId } });
    revalidatePath("/admin/plans");
    revalidatePath("/", "layout");
    return { success: true, message: "Plano excluído com sucesso." };
  } catch (err) {
    console.error("Erro ao excluir plano:", err);
    return { success: false, error: "Não foi possível excluir o plano (pode ter empresas associadas)." };
  }
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
