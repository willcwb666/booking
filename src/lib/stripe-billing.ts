import "server-only";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type { Plan } from "@/generated/prisma/client";

// Moeda de cobrança das assinaturas da plataforma (planos).
// Independente da moeda de cada empresa — o SaaS cobra numa moeda só.
export const PLATFORM_BILLING_CURRENCY = (
  process.env.PLATFORM_BILLING_CURRENCY ?? "brl"
).toLowerCase();

function toCents(value: unknown): number {
  return Math.round(Number(value) * 100);
}

/**
 * Sincroniza um plano do banco com o Stripe:
 * - cria/atualiza o Product
 * - cria Prices (mensal e anual) quando o valor mudou — Prices no Stripe são
 *   imutáveis, então recriamos e desativamos o antigo
 * Retorna os IDs a serem persistidos no plano.
 */
export async function syncPlanWithStripe(plan: Plan): Promise<{
  stripeProductId: string;
  stripePriceMonthlyId: string;
  stripePriceYearlyId: string;
}> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurada");
  }

  // 1. Product
  let productId = plan.stripeProductId ?? undefined;
  if (productId) {
    try {
      await stripe.products.update(productId, {
        name: plan.displayName,
        description: plan.description ?? undefined,
        active: plan.isActive,
      });
    } catch {
      productId = undefined; // produto sumiu no Stripe — recria
    }
  }
  if (!productId) {
    const product = await stripe.products.create({
      name: plan.displayName,
      description: plan.description ?? undefined,
      active: plan.isActive,
      metadata: { planId: plan.id, tier: plan.tier },
    });
    productId = product.id;
  }

  // 2. Prices (recria quando o valor mudou)
  const monthlyCents = toCents(plan.priceMonthly);
  const yearlyCents = toCents(plan.priceYearly);

  const monthlyId = await ensurePrice(
    productId,
    plan.stripePriceMonthlyId,
    monthlyCents,
    "month",
    plan.id
  );
  const yearlyId = await ensurePrice(
    productId,
    plan.stripePriceYearlyId,
    yearlyCents,
    "year",
    plan.id
  );

  return {
    stripeProductId: productId,
    stripePriceMonthlyId: monthlyId,
    stripePriceYearlyId: yearlyId,
  };
}

async function ensurePrice(
  productId: string,
  existingPriceId: string | null,
  amountCents: number,
  interval: "month" | "year",
  planId: string
): Promise<string> {
  // Reusa o Price atual se o valor bate (Prices são imutáveis)
  if (existingPriceId) {
    try {
      const price = await stripe.prices.retrieve(existingPriceId);
      if (
        price.active &&
        price.unit_amount === amountCents &&
        price.currency === PLATFORM_BILLING_CURRENCY &&
        price.recurring?.interval === interval
      ) {
        return existingPriceId;
      }
      // Valor mudou — desativa o antigo antes de criar o novo
      await stripe.prices.update(existingPriceId, { active: false });
    } catch {
      // preço sumiu — segue para criar
    }
  }

  const created = await stripe.prices.create({
    product: productId,
    unit_amount: amountCents,
    currency: PLATFORM_BILLING_CURRENCY,
    recurring: { interval },
    metadata: { planId, interval },
  });
  return created.id;
}

/**
 * Garante um Stripe Customer para a empresa (cria se ainda não existe)
 * e persiste o ID.
 */
export async function ensureStripeCustomer(companyId: string): Promise<string> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, stripeCustomerId: true, members: { where: { role: "OWNER" }, select: { user: { select: { email: true } } }, take: 1 } },
  });
  if (!company) throw new Error("Empresa não encontrada");
  if (company.stripeCustomerId) return company.stripeCustomerId;

  const ownerEmail = company.members[0]?.user.email;
  const customer = await stripe.customers.create({
    name: company.name,
    email: ownerEmail,
    metadata: { companyId: company.id },
  });

  await db.company.update({
    where: { id: company.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}
