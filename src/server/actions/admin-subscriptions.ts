"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { revalidatePath } from "next/cache";

export type StripeSubscriptionDetail = {
  id: string;
  status: string;
  planName: string;
  amount: number;
  currency: string;
  interval: string;
  created: number; // timestamp
  currentPeriodEnd: number; // timestamp
  latestPaymentIntentId?: string | null;
};

/**
 * Lista todas as assinaturas registradas no Stripe para uma determinada empresa.
 */
export async function getCompanyStripeSubscriptionsAction(companySlug: string): Promise<{
  success: boolean;
  subscriptions?: StripeSubscriptionDetail[];
  error?: string;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, error: "Acesso restrito ao Super Admin" };
  }

  const company = await db.company.findFirst({
    where: { slug: companySlug },
    select: { stripeCustomerId: true },
  });

  if (!company || !company.stripeCustomerId || !stripeEnabled) {
    return { success: true, subscriptions: [] };
  }

  try {
    const subs = await stripe.subscriptions.list({
      customer: company.stripeCustomerId,
      expand: ["data.latest_invoice"],
    });

    // Auto-sincroniza o plano no banco com base na assinatura ativa no Stripe
    if (subs.data.length > 0) {
      const activeSub = subs.data.find((s) => s.status === "active") || subs.data[0];
      const activePriceId = activeSub?.items.data[0]?.price?.id;
      if (activePriceId) {
        const matchedPlan = await db.plan.findFirst({
          where: {
            OR: [
              { stripePriceMonthlyId: activePriceId },
              { stripePriceYearlyId: activePriceId },
            ],
          },
          select: { id: true },
        });
        if (matchedPlan) {
          const compRec = await db.company.findFirst({ where: { slug: companySlug }, select: { id: true, planId: true } });
          if (compRec && compRec.planId !== matchedPlan.id) {
            await db.company.update({
              where: { id: compRec.id },
              data: { planId: matchedPlan.id },
            });
            revalidatePath("/admin/financeiro");
            revalidatePath(`/${companySlug}/configuracoes`);
          }
        }
      }
    }

    const items: StripeSubscriptionDetail[] = subs.data.map((s) => {
      const lineItem = s.items.data[0];
      const price = lineItem?.price;
      // `payment_intent`/`current_period_end` saíram dos tipos na API dahlia,
      // mas seguem no payload — acesso via any
      const latestInvoice = typeof s.latest_invoice === "object" ? (s.latest_invoice as any) : null;
      const piId =
        latestInvoice && typeof latestInvoice.payment_intent === "string"
          ? latestInvoice.payment_intent
          : latestInvoice && typeof latestInvoice.payment_intent === "object"
          ? latestInvoice.payment_intent?.id
          : null;

      return {
        id: s.id,
        status: s.status,
        planName: (price?.product as any)?.name || price?.nickname || "Plano SaaS",
        amount: (price?.unit_amount ?? 0) / 100,
        currency: (price?.currency ?? "BRL").toUpperCase(),
        interval: price?.recurring?.interval ?? "month",
        created: s.created,
        currentPeriodEnd: (s as any).current_period_end,
        latestPaymentIntentId: piId,
      };
    });

    return { success: true, subscriptions: items };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao consultar assinaturas no Stripe";
    return { success: false, error: msg };
  }
}

/**
 * Cancela UMA assinatura específica escolhida pelo Super Admin
 * e, opcionalmente, emite o reembolso do último pagamento.
 */
export async function cancelSpecificSubscriptionWithRefundAction({
  companySlug,
  subscriptionId,
  issueRefund,
}: {
  companySlug: string;
  subscriptionId: string;
  issueRefund: boolean;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, error: "Acesso restrito ao Super Admin" };
  }

  if (!stripeEnabled) {
    return { success: false, error: "Stripe não configurado" };
  }

  try {
    // 1. Buscar a assinatura no Stripe para pegar o pagamento
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice"],
    });

    let refundMsg = "";
    if (issueRefund) {
      const invoice = typeof sub.latest_invoice === "object" ? (sub.latest_invoice as any) : null;
      const piId =
        invoice && typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : invoice && typeof invoice.payment_intent === "object"
          ? invoice.payment_intent?.id
          : null;

      if (piId) {
        try {
          await stripe.refunds.create({ payment_intent: piId });
          refundMsg = " e o reembolso foi efetuado no cartão do cliente";
        } catch (e) {
          console.error("[Refund Error]:", e);
          refundMsg = " (atenção: o reembolso no Stripe precisa ser verificado)";
        }
      }
    }

    // 2. Cancelar a assinatura escolhida no Stripe
    await stripe.subscriptions.cancel(subscriptionId);

    // 3. Atualizar o banco de dados se a assinatura cancelada era a vinculada
    const company = await db.company.findFirst({ where: { slug: companySlug } });
    if (company && company.stripeSubscriptionId === subscriptionId) {
      // Buscar se sobrou outra assinatura ativa
      const remaining = await stripe.subscriptions.list({
        customer: company.stripeCustomerId!,
        status: "active",
      });

      if (remaining.data.length > 0) {
        const nextSub = remaining.data[0];
        const nextItem = nextSub.items.data[0];
        await db.company.update({
          where: { id: company.id },
          data: {
            stripeSubscriptionId: nextSub.id,
            subscriptionStatus: "active",
            subscriptionInterval: nextItem?.price.recurring?.interval ?? "month",
          },
        });
      } else {
        await db.company.update({
          where: { id: company.id },
          data: {
            stripeSubscriptionId: null,
            subscriptionStatus: "canceled",
          },
        });
      }
    }

    revalidatePath("/admin/financeiro");
    revalidatePath(`/${companySlug}/configuracoes`);

    return {
      success: true,
      message: `Assinatura ${subscriptionId} cancelada com sucesso${refundMsg}!`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao cancelar assinatura no Stripe";
    return { success: false, error: msg };
  }
}

/**
 * Varre todas as empresas e sincroniza o planId e o status do banco
 * de acordo com as assinaturas realmente ATIVAS no Stripe.
 */
export async function syncAllCompanyPlansWithStripeAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, error: "Sem permissão de administrador" };
  }

  const { stripe, stripeEnabled } = await import("@/lib/stripe");
  if (!stripeEnabled) return { success: false, error: "Stripe desativado nesta instância" };

  try {
    const companies = await db.company.findMany({
      where: { stripeCustomerId: { not: null } },
      select: { id: true, slug: true, stripeCustomerId: true, planId: true },
    });

    let updatedCount = 0;
    for (const c of companies) {
      if (!c.stripeCustomerId) continue;
      const subs = await stripe.subscriptions.list({
        customer: c.stripeCustomerId,
        status: "active",
      });

      if (subs.data.length > 0) {
        const activeSub = subs.data[0];
        const priceId = activeSub.items.data[0]?.price?.id;
        const interval = activeSub.items.data[0]?.price?.recurring?.interval ?? "month";

        if (priceId) {
          const matchedPlan = await db.plan.findFirst({
            where: {
              OR: [
                { stripePriceMonthlyId: priceId },
                { stripePriceYearlyId: priceId },
              ],
            },
            select: { id: true },
          });

          if (matchedPlan) {
            await db.company.update({
              where: { id: c.id },
              data: {
                planId: matchedPlan.id,
                subscriptionStatus: "active",
                subscriptionInterval: interval,
                stripeSubscriptionId: activeSub.id,
              },
            });
            updatedCount++;
          }
        }
      }
    }

    revalidatePath("/admin/financeiro");
    revalidatePath("/admin");
    return {
      success: true,
      message: `Sincronização concluída! ${updatedCount} empresa(s) atualizada(s) conforme os planos reais do Stripe.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao sincronizar com o Stripe";
    return { success: false, error: msg };
  }
}
