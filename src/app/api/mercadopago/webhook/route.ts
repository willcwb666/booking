import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { decrypt } from "@/lib/encrypt";
import { notifyBookingConfirmed, notifyCompanyNewBooking } from "@/lib/notifications";
import { triggerWebhooks } from "@/lib/webhooks";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { type, data } = body as { type?: string; data?: { id?: string } };

    if (type !== "payment" || !data?.id) {
      return NextResponse.json({ ok: true });
    }

    const paymentId = String(data.id);

    // Find booking by MP payment ID
    const booking = await db.booking.findFirst({
      where: { mercadoPagoPaymentId: paymentId },
      include: {
        company: {
          include: { paymentSettings: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ ok: true });
    }

    if (!booking.company.paymentSettings?.mercadoPagoAccessToken) {
      return NextResponse.json({ ok: true });
    }

    // Verify payment status with MP API
    const accessToken = decrypt(booking.company.paymentSettings.mercadoPagoAccessToken);
    const mpClient = new MercadoPagoConfig({ accessToken });
    const paymentApi = new Payment(mpClient);
    const payment = await paymentApi.get({ id: paymentId });

    if (payment.status === "approved") {
      await db.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
        },
      });

      void notifyBookingConfirmed(booking.id);
      void notifyCompanyNewBooking(booking.id);
      void triggerWebhooks(booking.companyId, "BOOKING_CONFIRMED", { bookingId: booking.id });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mp-webhook] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
