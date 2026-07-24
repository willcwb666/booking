"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/stripe-billing";

type CheckoutResult =
  | { success: true; url: string }
  | { success: false; error: string };

async function resolveOwnedCompany(slug: string, userId: string, isAdmin: boolean) {
  // OWNER da empresa (ou admin da plataforma) pode gerenciar a assinatura
  const member = await db.companyUser.findFirst({
    where: {
      company: { slug },
      userId,
      isActive: true,
      role: "OWNER",
    },
    select: { company: { select: { id: true } } },
  });
  if (member) return member.company.id;
  if (isAdmin) {
    const company = await db.company.findUnique({ where: { slug }, select: { id: true } });
    return company?.id ?? null;
  }
  return null;
}

function appUrl() {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

/**
 * Inicia o Stripe Checkout de assinatura para o plano escolhido.
 * O preço é sempre o Price do Stripe (nunca vem do cliente).
 */
export async function createPlanCheckoutAction(
  companySlug: string,
  planId: string,
  interval: "month" | "year"
): Promise<CheckoutResult> {
  if (!stripeEnabled) return { success: false, error: "Cobrança não configurada nesta instância" };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const companyId = await resolveOwnedCompany(companySlug, session.user.id, session.user.role === "admin");
  if (!companyId) return { success: false, error: "Apenas o dono da empresa pode assinar" };

  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) return { success: false, error: "Plano indisponível" };

  const priceId = interval === "year" ? plan.stripePriceYearlyId : plan.stripePriceMonthlyId;
  if (!priceId) {
    return { success: false, error: "Este plano ainda não está disponível para cobrança. Contate o suporte." };
  }

  const customerId = await ensureStripeCustomer(companyId);

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Vincula a assinatura à empresa+plano — lido no webhook
    subscription_data: { metadata: { companyId, planId } },
    metadata: { companyId, planId },
    success_url: `${appUrl()}/${companySlug}/configuracoes?assinatura=sucesso`,
    cancel_url: `${appUrl()}/${companySlug}/configuracoes?assinatura=cancelado`,
    allow_promotion_codes: true,
  });

  if (!checkout.url) return { success: false, error: "Não foi possível iniciar o checkout" };
  return { success: true, url: checkout.url };
}

/**
 * Abre o Billing Portal do Stripe (trocar cartão, cancelar, ver faturas).
 */
export async function createBillingPortalAction(companySlug: string): Promise<CheckoutResult> {
  if (!stripeEnabled) return { success: false, error: "Cobrança não configurada nesta instância" };

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const companyId = await resolveOwnedCompany(companySlug, session.user.id, session.user.role === "admin");
  if (!companyId) return { success: false, error: "Apenas o dono da empresa pode gerenciar a assinatura" };

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { stripeCustomerId: true },
  });
  if (!company?.stripeCustomerId) {
    return { success: false, error: "Nenhuma assinatura ativa para gerenciar" };
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${appUrl()}/${companySlug}/configuracoes`,
  });

  return { success: true, url: portal.url };
}
