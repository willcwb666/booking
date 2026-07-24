"use server";

import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { encrypt } from "@/lib/encrypt";
import { decrypt } from "@/lib/encrypt";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { notifyBookingConfirmed, notifyBookingCancelled, notifyStatusChanged, notifyCompanyNewBooking } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { createPixPayment } from "@/lib/mercadopago";
import { triggerWebhooks } from "@/lib/webhooks";
import { createCalendarEvent } from "@/lib/google-calendar";
import { isSlotAvailable } from "@/lib/agenda";
import { notifyWaitlistForDate } from "./waitlist";
import { randomUUID } from "crypto";

type CreateResult =
  | { success: true; bookingId: string; paymentMethod: "CASH_CHECK" }
  | { success: true; bookingId: string; paymentMethod: "CARD"; clientSecret: string }
  | { success: true; bookingId: string; paymentMethod: "PIX"; pixQrCode: string; pixQrCodeBase64: string }
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
  const chosenMethodId = (formData.get("companyPaymentMethodId") as string) || null;

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

  // Load estimate
  const estimate = await db.estimate.findFirst({
    where: { id: estimateId, status: "PENDING" },
    include: { bookingConfig: true, company: { select: { currency: true } } },
  });
  if (!estimate) {
    return { success: false, errors: { _: ["Orçamento não encontrado ou expirado"] } };
  }

  // Resolve a forma de pagamento configurada (nova) ou o enum legado.
  // O fluxo (Stripe / MP PIX / manual) é derivado do kind do método — nunca
  // de string livre do cliente.
  let chosenMethod = null;
  if (chosenMethodId) {
    chosenMethod = await db.companyPaymentMethod.findFirst({
      where: { id: chosenMethodId, companyId: estimate.companyId, isActive: true },
    });
    if (!chosenMethod) {
      return { success: false, errors: { _: ["Forma de pagamento inválida"] } };
    }
  }

  const paymentMethod = chosenMethod
    ? chosenMethod.kind === "STRIPE_CARD"
      ? "CARD"
      : chosenMethod.kind === "MERCADOPAGO_PIX"
        ? "PIX"
        : "CASH_CHECK"
    : paymentMethodRaw === "CARD"
      ? "CARD"
      : paymentMethodRaw === "PIX"
        ? "PIX"
        : "CASH_CHECK";

  // Verify agenda belongs to this booking config
  if (estimate.bookingConfig.agendaId !== agendaId) {
    return { success: false, errors: { _: ["Agenda inválida para este agendamento"] } };
  }
  const agenda = await db.agenda.findFirst({
    where: { id: agendaId, status: "ACTIVE" },
  });
  if (!agenda) {
    return { success: false, errors: { _: ["Agenda não encontrada"] } };
  }

  // Server-side slot validation: o horário precisa coincidir com um slot
  // disponível da grade (bloqueia horários arbitrários, overlaps, dias
  // bloqueados e datas fora da agenda)
  const slotOk = await isSlotAvailable(agendaId, scheduledDate, scheduledStartTime, scheduledEndTime);
  if (!slotOk) {
    return { success: false, errors: { _: ["Horário indisponível. Por favor, escolha outro horário."] } };
  }

  const accessNote = accessNotePlain ? encrypt(accessNotePlain) : null;

  // Determine initial status
  const bookingStatus = paymentMethod === "CASH_CHECK" ? "CONFIRMED" : "PENDING";

  // Fetch company payment settings (needed for PIX)
  const paymentSettings = await db.companyPaymentSettings.findUnique({
    where: { companyId: estimate.companyId },
  });

  // Validate PIX availability (PIX automático exige token do Mercado Pago;
  // com método configurado o isActive já foi validado, senão vale o flag legado)
  if (paymentMethod === "PIX") {
    const pixEnabled = chosenMethod ? true : paymentSettings?.enablePix;
    if (!pixEnabled || !paymentSettings?.mercadoPagoAccessToken) {
      return { success: false, errors: { _: ["PIX não disponível para esta empresa"] } };
    }
  }

  // Recurrence setup
  const rawFrequency = estimate.frequency;
  const recurrenceGroupId = rawFrequency !== "ONCE" ? randomUUID() : null;
  const recurrenceFrequency = rawFrequency !== "ONCE" ? rawFrequency : null;

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
          paymentStatus: "PENDING",
          companyPaymentMethodId: chosenMethod?.id ?? null,
          recurrenceGroupId,
          recurrenceFrequency,
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

    // Create recurring series (additional slots for WEEKLY/BIWEEKLY/MONTHLY)
    if (recurrenceGroupId && recurrenceFrequency) {
      const COUNTS: Record<string, number> = { WEEKLY: 11, BIWEEKLY: 11, MONTHLY: 5 };
      const DAYS: Record<string, number> = { WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30 };
      const count = COUNTS[recurrenceFrequency] ?? 0;
      const daysStep = DAYS[recurrenceFrequency] ?? 7;
      const [baseY, baseM, baseD] = scheduledDate.split("-").map(Number);
      const baseDate = new Date(Date.UTC(baseY, baseM - 1, baseD));

      for (let i = 1; i <= count; i++) {
        const nextDate = new Date(baseDate);
        nextDate.setUTCDate(baseDate.getUTCDate() + daysStep * i);
        const nextDateStr = nextDate.toISOString().split("T")[0];

        // Ocorrência só é criada se cair em slot válido da grade
        // (respeita dias de funcionamento, exceções e horários ocupados)
        const occurrenceOk = await isSlotAvailable(agendaId, nextDateStr, scheduledStartTime, scheduledEndTime);
        if (!occurrenceOk) continue;

        try {
          const recBooking = await db.booking.create({
            data: {
              companyId: estimate.companyId,
              bookingConfigId: estimate.bookingConfigId,
              agendaId,
              scheduledDate: nextDateStr,
              scheduledStartTime,
              scheduledEndTime,
              status: bookingStatus,
              paymentMethod,
              paymentStatus: "PENDING",
              companyPaymentMethodId: chosenMethod?.id ?? null,
              recurrenceGroupId,
              recurrenceFrequency,
            },
          });
          await db.bookingSlot.create({
            data: {
              bookingId: recBooking.id,
              agendaId,
              date: nextDateStr,
              startTime: scheduledStartTime,
              endTime: scheduledEndTime,
            },
          });
          // Copy customer detail and home access from primary booking
          await db.bookingCustomerDetail.create({
            data: {
              bookingId: recBooking.id,
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
          await db.bookingHomeAccess.create({
            data: {
              bookingId: recBooking.id,
              accessType,
              keepKeyWithProvider,
              accessNote,
              additionalNote,
            },
          });
        } catch {
          // Slot taken for this date — skip
        }
      }
    }

    if (paymentMethod === "CASH_CHECK") {
      // CASH_CHECK bookings are immediately CONFIRMED — notify now
      void notifyBookingConfirmed(booking.id);
      void notifyCompanyNewBooking(booking.id);
      void triggerWebhooks(booking.companyId, "BOOKING_CONFIRMED", { bookingId: booking.id });
      void syncToGoogleCalendar(booking.id);
      return { success: true, bookingId: booking.id, paymentMethod: "CASH_CHECK" };
    }

    if (paymentMethod === "PIX") {
      const pixResult = await createPixPayment(paymentSettings!.mercadoPagoAccessToken!, {
        bookingId: booking.id,
        amount: Number(estimate.total),
        description: `Agendamento #${booking.id.slice(-8)}`,
        payerEmail: email,
        payerName: `${firstName} ${lastName}`,
      });

      await db.booking.update({
        where: { id: booking.id },
        data: { mercadoPagoPaymentId: pixResult.id },
      });

      return {
        success: true,
        bookingId: booking.id,
        paymentMethod: "PIX",
        pixQrCode: pixResult.qrCode,
        pixQrCodeBase64: pixResult.qrCodeBase64,
      };
    }

    // Create Stripe PaymentIntent na moeda da empresa (multi-mercado)
    const amountCents = Math.round(Number(estimate.total) * 100);
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: (estimate.company?.currency ?? "BRL").toLowerCase(),
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

async function syncToGoogleCalendar(bookingId: string): Promise<void> {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: {
          include: {
            members: {
              where: { role: "OWNER", isActive: true },
              select: { userId: true },
            },
          },
        },
        bookingConfig: { select: { name: true } },
        customerDetail: { select: { address: true, city: true } },
      },
    });
    if (!booking) return;

    const ownerIds = booking.company.members.map((m) => m.userId);
    for (const userId of ownerIds) {
      const integration = await db.calendarIntegration.findUnique({
        where: { userId_provider: { userId, provider: "GOOGLE" } },
      });
      if (!integration?.isActive) continue;

      await createCalendarEvent(integration.accessToken, integration.refreshToken ?? null, {
        summary: `${booking.bookingConfig.name} — ${booking.company.name}`,
        description: `Agendamento #${bookingId}`,
        date: booking.scheduledDate,
        startTime: booking.scheduledStartTime,
        endTime: booking.scheduledEndTime,
        location: booking.customerDetail
          ? `${booking.customerDetail.address}, ${booking.customerDetail.city}`
          : undefined,
        calendarId: integration.calendarId ?? "primary",
      });
    }
  } catch (err) {
    console.error("[syncToGoogleCalendar]", err);
  }
}

export async function checkPixPaymentAction(bookingId: string): Promise<{ paid: boolean }> {
  // Action pública (checkout anônimo faz polling a cada 5s = 12/min) —
  // 30/min por IP cobre o uso legítimo e barra enumeração/abuso da API do MP
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit(`pix:check:${ip}`, 30, 60);
  if (!rl.allowed) return { paid: false };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { paymentStatus: true, mercadoPagoPaymentId: true, companyId: true },
  });
  if (!booking) return { paid: false };
  if (booking.paymentStatus === "PAID") return { paid: true };

  // If still PENDING, verify directly with MP API
  if (booking.mercadoPagoPaymentId && booking.paymentStatus === "PENDING") {
    try {
      const { getPixPaymentStatus } = await import("@/lib/mercadopago");
      const settings = await db.companyPaymentSettings.findUnique({
        where: { companyId: booking.companyId },
      });
      if (settings?.mercadoPagoAccessToken) {
        const status = await getPixPaymentStatus(settings.mercadoPagoAccessToken, booking.mercadoPagoPaymentId);
        if (status === "approved") {
          await db.booking.update({
            where: { id: bookingId },
            data: { paymentStatus: "PAID", status: "CONFIRMED" },
          });
          void notifyBookingConfirmed(bookingId);
          void notifyCompanyNewBooking(bookingId);
          return { paid: true };
        }
      }
    } catch (err) {
      console.error("[checkPixPayment] MP API check failed:", err);
    }
  }

  return { paid: false };
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
  void triggerWebhooks(booking.companyId, "BOOKING_CANCELLED", { bookingId });
  // Notify waitlist entries for this date
  void notifyWaitlistForDate(booking.agendaId, booking.scheduledDate, booking.companyId);
  return { success: true };
}

// ─── Refund ───────────────────────────────────────────────────────────────────

export async function refundBookingAction(
  bookingId: string,
  companySlug: string
): Promise<StatusResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, company: { slug: companySlug }, isActive: true },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "MANAGER")) {
    return { success: false, error: "Sem permissão" };
  }

  const booking = await db.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado" };
  if (!booking.stripePaymentIntentId) return { success: false, error: "Pagamento não foi por cartão" };
  if (booking.paymentStatus !== "PAID") return { success: false, error: "Pagamento não confirmado" };
  if ((booking.paymentStatus as string) === "REFUNDED") return { success: false, error: "Já reembolsado" };

  const refund = await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId });

  await db.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "REFUNDED",
      refundAmount: refund.amount / 100,
      refundedAt: new Date(),
    },
  });

  return { success: true };
}

// ─── Confirmação manual de recebimento ────────────────────────────────────────
// Para métodos MANUAL (dinheiro, PIX por chave, Zelle, Venmo…) o gateway não
// confirma nada — o dono/gerente marca o recebimento aqui.

export async function markBookingPaidAction(
  bookingId: string,
  companySlug: string
): Promise<StatusResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, company: { slug: companySlug }, isActive: true },
  });
  if (!member || (member.role !== "OWNER" && member.role !== "MANAGER")) {
    return { success: false, error: "Sem permissão" };
  }

  const booking = await db.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado" };
  if (booking.paymentStatus !== "PENDING") {
    return { success: false, error: "Pagamento não está aguardando confirmação" };
  }
  if (booking.status === "CANCELLED") {
    return { success: false, error: "Agendamento cancelado" };
  }

  const wasPending = booking.status === "PENDING";

  await db.booking.update({
    where: { id: bookingId },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      paymentConfirmedById: session.user.id,
      // Booking aguardando pagamento passa a confirmado
      ...(wasPending ? { status: "CONFIRMED" } : {}),
    },
  });

  if (wasPending) {
    void notifyBookingConfirmed(bookingId);
    void triggerWebhooks(booking.companyId, "BOOKING_CONFIRMED", { bookingId });
  }

  return { success: true };
}

// ─── Reschedule ───────────────────────────────────────────────────────────────

export async function rescheduleBookingAction(
  bookingId: string,
  companySlug: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string
): Promise<StatusResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, company: { slug: companySlug }, isActive: true },
  });
  if (!member) return { success: false, error: "Acesso negado" };
  if (member.role !== "OWNER" && member.role !== "MANAGER") {
    return { success: false, error: "Sem permissão para reagendar" };
  }

  const booking = await db.booking.findFirst({
    where: { id: bookingId, company: { slug: companySlug } },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado" };
  if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") {
    return { success: false, error: "Somente agendamentos confirmados podem ser reagendados" };
  }

  // Server-side slot validation (grade da agenda + exceções + ocupados)
  const slotOk = await isSlotAvailable(booking.agendaId, newDate, newStartTime, newEndTime);
  if (!slotOk) {
    return { success: false, error: "Horário indisponível. Escolha outro horário." };
  }

  try {
    await db.$transaction(async (tx) => {
      // Release old slot
      await tx.bookingSlot.deleteMany({ where: { bookingId } });
      // Create new slot (throws P2002 if taken)
      await tx.bookingSlot.create({
        data: {
          bookingId,
          agendaId: booking.agendaId,
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
        },
      });
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          scheduledDate: newDate,
          scheduledStartTime: newStartTime,
          scheduledEndTime: newEndTime,
          rescheduledAt: new Date(),
          status: "CONFIRMED",
        },
      });
    });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return { success: false, error: "Horário já ocupado. Escolha outro horário." };
    }
    throw e;
  }

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
  if (newStatus === "COMPLETED") {
    void triggerWebhooks(booking.companyId, "BOOKING_COMPLETED", { bookingId });
  } else if (newStatus === "CONFIRMED") {
    void triggerWebhooks(booking.companyId, "BOOKING_CONFIRMED", { bookingId });
  }
  return { success: true };
}
