import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { notifyBookingConfirmed, notifyCompanyNewBooking } from "@/lib/notifications";
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
    await db.booking.updateMany({
      where: { stripePaymentIntentId: pi.id },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
    });
    // Notify after payment confirmed
    const booking = await db.booking.findFirst({ where: { stripePaymentIntentId: pi.id } });
    if (booking) {
      void notifyBookingConfirmed(booking.id);
      void notifyCompanyNewBooking(booking.id);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const failedBooking = await db.booking.findFirst({
      where: { stripePaymentIntentId: pi.id },
    });
    if (failedBooking) {
      await db.$transaction([
        db.booking.update({
          where: { id: failedBooking.id },
          data: { paymentStatus: "FAILED", status: "CANCELLED", cancelledAt: new Date(), cancellationReason: "Pagamento falhou" },
        }),
        // Release the slot so other customers can book this time
        db.bookingSlot.deleteMany({ where: { bookingId: failedBooking.id } }),
      ]);
    }
  }

  return new Response("ok", { status: 200 });
}
