"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateCompanySubscriptionAction(
  companyId: string,
  newStatus: string,
  newPlanId?: string
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, error: "Sem permissão de administrador" };
  }

  try {
    const data: Record<string, unknown> = {
      subscriptionStatus: newStatus,
    };
    if (newPlanId) {
      data.planId = newPlanId;
    }

    await db.company.update({
      where: { id: companyId },
      data,
    });

    revalidatePath("/admin/financeiro");
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar assinatura";
    return { success: false, error: msg };
  }
}

export async function cancelDuplicateSubscriptionsAction(companySlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const company = await db.company.findFirst({
    where: { slug: companySlug },
    select: { id: true, name: true, stripeCustomerId: true },
  });

  if (!company) return { success: false, error: "Empresa não encontrada" };

  const { stripe, stripeEnabled } = await import("@/lib/stripe");

  if (stripeEnabled && company.stripeCustomerId) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: company.stripeCustomerId,
        status: "active",
      });

      if (subs.data.length > 1) {
        // Ordenar da mais recente para a mais antiga
        const sorted = subs.data.sort((a, b) => b.created - a.created);
        const latestSub = sorted[0];
        const extraSubs = sorted.slice(1);

        // Cancelar todas as assinaturas extras antigas no Stripe
        for (const sub of extraSubs) {
          await stripe.subscriptions.cancel(sub.id);
        }

        const item = latestSub.items.data[0];
        await db.company.update({
          where: { id: company.id },
          data: {
            stripeSubscriptionId: latestSub.id,
            subscriptionStatus: "active",
            subscriptionInterval: item?.price.recurring?.interval ?? "month",
            subscriptionPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
          },
        });

        revalidatePath(`/admin/financeiro`);
        revalidatePath(`/${companySlug}/configuracoes`);
        return {
          success: true,
          message: `Resolvido! Mantida apenas a assinatura mais recente (${latestSub.id}) e as extras foram canceladas no Stripe.`,
        };
      }
    } catch (err) {
      console.error("[cancelDuplicateSubscriptionsAction Error]:", err);
    }
  }

  // Caso haja apenas 1 ou nenhuma duplicata
  await db.company.update({
    where: { id: company.id },
    data: {
      subscriptionStatus: "active",
    },
  });

  revalidatePath(`/admin/financeiro`);
  revalidatePath(`/${companySlug}/configuracoes`);
  return { success: true, message: "Assinatura da empresa regularizada." };
}
