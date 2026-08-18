import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { decrypt } from "@/lib/encrypt";
import { notifyBookingConfirmed, notifyCompanyNewBooking } from "@/lib/notifications";
import { triggerWebhooks } from "@/lib/webhooks";
import { revertAndCancelUnpaidBooking } from "@/lib/booking-reversal";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Valida a assinatura HMAC do header `x-signature` do Mercado Pago.
 * Manifest: `id:[data.id];request-id:[x-request-id];ts:[ts];`
 * (campos ausentes são omitidos; data.id vem da query string, em minúsculas).
 * A chave é a "assinatura secreta" do painel de webhooks da aplicação MP
 * (env MERCADOPAGO_WEBHOOK_SECRET).
 */
function verifyMpSignature(req: NextRequest): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mp-webhook] MERCADOPAGO_WEBHOOK_SECRET não configurado — webhook rejeitado");
      return false;
    }
    // Em dev, o status do pagamento é sempre re-verificado na API do MP
    // antes de confirmar o booking, então seguimos sem assinatura
    console.warn("[mp-webhook] MERCADOPAGO_WEBHOOK_SECRET não configurado — assinatura não verificada (dev)");
    return true;
  }

  const xSignature = req.headers.get("x-signature");
  if (!xSignature) return false;

  const parts = new Map(
    xSignature.split(",").map((p) => {
      const idx = p.indexOf("=");
      return [p.slice(0, idx).trim(), p.slice(idx + 1).trim()] as const;
    })
  );
  const ts = parts.get("ts");
  const v1 = parts.get("v1");
  if (!ts || !v1) return false;

  const dataId = req.nextUrl.searchParams.get("data.id");
  const xRequestId = req.headers.get("x-request-id");

  let manifest = "";
  if (dataId) manifest += `id:${dataId.toLowerCase()};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = Buffer.from(createHmac("sha256", secret).update(manifest).digest("hex"), "hex");
  let received: Buffer;
  try {
    received = Buffer.from(v1, "hex");
  } catch {
    return false;
  }
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyMpSignature(request)) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 403 });
  }

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
      // Idempotente: só notifica na primeira confirmação — o MP pode reentregar
      // o mesmo evento mais de uma vez.
      const alreadyPaid = booking.paymentStatus === "PAID";
      await db.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
        },
      });

      if (!alreadyPaid) {
        void notifyBookingConfirmed(booking.id);
        void notifyCompanyNewBooking(booking.id);
        void triggerWebhooks(booking.companyId, "BOOKING_CONFIRMED", { bookingId: booking.id });
      }
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      // PIX recusado ou expirado: estorna gift card/sessão e libera o slot.
      // (Idempotente — não reverte de novo se o booking já estiver cancelado.)
      await revertAndCancelUnpaidBooking(booking.id, "Pagamento PIX não concluído");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mp-webhook] Error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
