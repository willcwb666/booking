import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { notifyBookingConfirmed, notifyCompanyNewBooking } from "@/lib/notifications";
import { revertAndCancelUnpaidBooking } from "@/lib/booking-reversal";
import type { NextRequest } from "next/server";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    // Read before update so we can detect idempotent re-deliveries — Stripe may
    // send the same event more than once; only notify on the first confirmation.
    const booking = await db.booking.findFirst({
      where: { stripePaymentIntentId: pi.id },
      select: { id: true, paymentStatus: true },
    });
    if (!booking) return new Response("ok", { status: 200 });

    const alreadyPaid = booking.paymentStatus === "PAID";
    await db.booking.updateMany({
      where: { stripePaymentIntentId: pi.id },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
    });

    if (!alreadyPaid) {
      void notifyBookingConfirmed(booking.id);
      void notifyCompanyNewBooking(booking.id);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const failedBooking = await db.booking.findFirst({
      where: { stripePaymentIntentId: pi.id },
      select: { id: true },
    });
    if (failedBooking) {
      // Estorna gift card/sessão e libera o slot antes de cancelar
      await revertAndCancelUnpaidBooking(failedBooking.id, "Pagamento falhou");
    }
  }

  // ─── Assinaturas de planos (Stripe Billing) ──────────────────────────────
  if (event.type === "checkout.session.completed") {
    const cs = event.data.object as Stripe.Checkout.Session;
    if (cs.mode === "subscription" && cs.subscription) {
      const subscriptionId = typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      await applySubscription(sub);
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await applySubscription(event.data.object as Stripe.Subscription);
  }

  if (event.type === "invoice.payment_failed") {
    // API dahlia removeu `invoice.subscription`; a assinatura agora vem em
    // `invoice.parent.subscription_details.subscription`. Tenta ambos (compat).
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | { id: string } | null;
      parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
    };
    const subRef = invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null;
    if (subRef) {
      const subscriptionId = typeof subRef === "string" ? subRef : subRef.id;
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      await applySubscription(sub);
    }
  }

  return new Response("ok", { status: 200 });
}

/**
 * Reflete o estado de uma assinatura do Stripe na empresa correspondente.
 * A empresa é identificada por metadata.companyId (setado no checkout) ou,
 * como fallback, pelo stripeCustomerId.
 */
async function applySubscription(sub: Stripe.Subscription): Promise<void> {
  const companyId = sub.metadata?.companyId;
  let planId = sub.metadata?.planId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const company = companyId
    ? await db.company.findUnique({ where: { id: companyId }, select: { id: true } })
    : await db.company.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!company) return;

  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  const interval = item?.price?.recurring?.interval ?? null;
  const periodEnd = item?.current_period_end ?? null;
  const canceled = sub.status === "canceled";

  // Sincroniza o plano real com base no Price ID do Stripe ativo
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
      planId = matchedPlan.id;
    }
  }

  await db.company.update({
    where: { id: company.id },
    data: {
      stripeSubscriptionId: canceled ? null : sub.id,
      stripeCustomerId: customerId,
      subscriptionStatus: sub.status,
      subscriptionInterval: interval,
      subscriptionPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      ...(planId && !canceled ? { planId } : {}),
    },
  });
}
