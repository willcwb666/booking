"use server";

import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { encrypt } from "@/lib/encrypt";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { notifyBookingConfirmed, notifyBookingCancelled, notifyStatusChanged, notifyCompanyNewBooking } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";

type CreateResult =
  | { success: true; bookingId: string; paymentMethod: "CASH_CHECK" }
  | { success: true; bookingId: string; paymentMethod: "CARD"; clientSecret: string }
  | { success: false; errors: Record<string, string[]> };

type CancelResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> };

export async function createBookingAction(formData: FormData): Promise<CreateResult> {
  // Rate limit: 10 bookings per minute per IP
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`booking:create:${ip}`, 10, 60);
  if (!rl.allowed) {
    return { success: false, errors: { _: ["Muitas tentativas. Aguarde um momento."] } };
  }

  const estimateId = formData.get("estimateId") as string;
  const agendaId = formData.get("agendaId") as string;
  const scheduledDate = formData.get("scheduledDate") as string;
  const scheduledStartTime = formData.get("scheduledStartTime") as string;
  const scheduledEndTime = formData.get("scheduledEndTime") as string;
  const paymentMethodRaw = formData.get("paymentMethod") as string;

  // Customer details
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const sendReminders = formData.get("sendReminders") === "true";
  const address = formData.get("address") as string;
  const aptNo = (formData.get("aptNo") as string) || null;
  const city = formData.get("city") as string;
  const zip = formData.get("zip") as string;

  // Home access
  const accessType = (formData.get("accessType") as string) || "someone_home";
  const keepKeyWithProvider = formData.get("keepKeyWithProvider") === "true";
  const accessNotePlain = (formData.get("accessNote") as string) || null;
  const additionalNote = (formData.get("additionalNote") as string) || null;

  // Validate required fields
  if (!estimateId || !agendaId || !scheduledDate || !scheduledStartTime || !scheduledEndTime) {
    return { success: false, errors: { _: ["Dados de agendamento incompletos"] } };
  }
  if (!firstName || !lastName || !email || !phone || !address || !city || !zip) {
    return { success: false, errors: { _: ["Preencha todos os campos obrigatórios"] } };
  }

  const paymentMethod = paymentMethodRaw === "CARD" ? "CARD" : "CASH_CHECK";

  // Load estimate
  const estimate = await db.estimate.findFirst({
    where: { id: estimateId, status: "PENDING" },
    include: { bookingConfig: true },
  });
  if (!estimate) {
    return { success: false, errors: { _: ["Orçamento não encontrado ou expirado"] } };
  }

  // Verify agenda belongs to this booking config
  const agenda = await db.agenda.findFirst({
    where: { id: agendaId, status: "ACTIVE" },
  });
  if (!agenda) {
    return { success: false, errors: { _: ["Agenda não encontrada"] } };
  }

  const accessNote = accessNotePlain ? encrypt(accessNotePlain) : null;

  // Determine initial status
  const bookingStatus = paymentMethod === "CASH_CHECK" ? "CONFIRMED" : "PENDING";

  try {
    const booking = await db.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          companyId: estimate.companyId,
          estimateId,
          bookingConfigId: estimate.bookingConfigId,
          agendaId,
          scheduledDate,
          scheduledStartTime,
          scheduledEndTime,
          status: bookingStatus,
          paymentMethod,
          paymentStatus: paymentMethod === "CASH_CHECK" ? "PENDING" : "PENDING",
        },
      });

      // This may throw P2002 if slot is taken — intentional
      await tx.bookingSlot.create({
        data: {
          bookingId: newBooking.id,
          agendaId,
          date: scheduledDate,
          startTime: scheduledStartTime,
          endTime: scheduledEndTime,
        },
      });

      await tx.bookingCustomerDetail.create({
        data: {
          bookingId: newBooking.id,
          firstName,
          lastName,
          email,
          phone,
          sendReminders,
          address,
          aptNo,
          city,
          zip,
        },
      });

      await tx.bookingHomeAccess.create({
        data: {
          bookingId: newBooking.id,
          accessType,
          keepKeyWithProvider,
          accessNote,
          additionalNote,
        },
      });

      await tx.estimate.update({
        where: { id: estimateId },
        data: { status: "CONVERTED" },
      });

      return newBooking;
    });

    if (paymentMethod === "CASH_CHECK") {
      // CASH_CHECK bookings are immediately CONFIRMED — notify now
      void notifyBookingConfirmed(booking.id);
      void notifyCompanyNewBooking(booking.id);
      return { success: true, bookingId: booking.id, paymentMethod: "CASH_CHECK" };
    }

    // Create Stripe PaymentIntent
    const amountCents = Math.round(Number(estimate.total) * 100);
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "brl",
      metadata: { bookingId: booking.id },
    });

    await db.booking.update({
      where: { id: booking.id },
      data: { stripePaymentIntentId: pi.id },
    });

    return {
      success: true,
      bookingId: booking.id,
      paymentMethod: "CARD",
      clientSecret: pi.client_secret!,
    };
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return {
        success: false,
        errors: { _: ["Este horário já foi reservado. Por favor, escolha outro horário."] },
      };
    }
    throw e;
  }
}

export async function cancelBookingAction(formData: FormData): Promise<CancelResult> {
  const bookingId = formData.get("bookingId") as string;
  const companySlug = formData.get("companySlug") as string;
  const reason = (formData.get("reason") as string) || null;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, errors: { _: ["Não autenticado"] } };

  const member = await db.companyUser.findFirst({
    where: {
      userId: session.user.id,
      company: { slug: companySlug },
      isActive: true,
    },
  });
  if (!member) return { success: false, errors: { _: ["Acesso negado"] } };

  const booking = await db.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
  });
  if (!booking) return { success: false, errors: { _: ["Agendamento não encontrado"] } };

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return { success: false, errors: { _: ["Este agendamento não pode ser cancelado"] } };
  }

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: session.user.id,
        cancellationReason: reason,
      },
    });
    await tx.bookingSlot.deleteMany({ where: { bookingId } });
  });

  // Issue refund if paid by card
  if (booking.stripePaymentIntentId && booking.paymentStatus === "PAID") {
    await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });
    await db.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: "REFUNDED" },
    });
  }

  void notifyBookingCancelled(bookingId);
  return { success: true };
}

// ─── Status lifecycle ─────────────────────────────────────────────────────────

type StatusResult = { success: true } | { success: false; error: string };

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  CONFIRMED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
};

export async function updateBookingStatusAction(
  bookingId: string,
  companySlug: string,
  newStatus: string
): Promise<StatusResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: {
      userId: session.user.id,
      company: { slug: companySlug },
      isActive: true,
    },
  });
  if (!member) return { success: false, error: "Acesso negado" };

  const booking = await db.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado" };

  const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return { success: false, error: "Transição de status não permitida" };
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: newStatus as "IN_PROGRESS" | "COMPLETED" },
  });

  void notifyStatusChanged(bookingId, newStatus);
  return { success: true };
}
