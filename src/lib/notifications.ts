import "server-only";
import { db } from "./db";
import {
  sendBookingConfirmationEmail,
  sendBookingReminderEmail,
  sendBookingCancelledEmail,
  sendReviewRequestEmail,
} from "./email";
import { generateSignedReviewToken } from "./security/signed-token";
import { REVIEW_LINK_TTL_DAYS } from "./review-policy";
import { sendPushNotifications } from "./push";
import {
  sendBookingConfirmedWhatsapp,
  sendBookingReminderWhatsapp,
  sendBookingCancelledWhatsapp,
} from "./whatsapp";
import {
  sendBookingConfirmedSms,
  sendBookingReminderSms,
  sendBookingCancelledSms,
} from "./sms";

async function getUserPushTokens(customerId: string | null | undefined): Promise<string[]> {
  if (!customerId) return [];
  const tokens = await db.pushToken.findMany({ where: { userId: customerId }, select: { token: true } });
  return tokens.map((t) => t.token);
}

export async function notifyBookingConfirmed(bookingId: string) {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: { select: { name: true, locale: true } },
        bookingConfig: { select: { name: true } },
        customerDetail: true,
        estimate: { select: { customerId: true } },
      },
    });
    if (!booking?.customerDetail) return;

    const { customerDetail: cd, company, bookingConfig } = booking;
    if (!cd.sendReminders) return;

    const address = `${cd.address}${cd.aptNo ? `, ${cd.aptNo}` : ""}, ${cd.city}`;
    const customerName = `${cd.firstName} ${cd.lastName}`;
    const locale = company.locale ?? "pt-BR";

    await sendBookingConfirmationEmail({
      to: cd.email,
      customerName,
      companyName: company.name,
      serviceName: bookingConfig.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
      endTime: booking.scheduledEndTime,
      address,
      locale,
    });

    void sendBookingConfirmedWhatsapp({
      phone: cd.phone,
      customerName,
      companyName: company.name,
      serviceName: bookingConfig.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
    });

    void sendBookingConfirmedSms({
      phone: cd.phone,
      customerName,
      companyName: company.name,
      serviceName: bookingConfig.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
      locale,
    });

    const tokens = await getUserPushTokens(booking.estimate?.customerId);
    await sendPushNotifications(
      tokens,
      "Agendamento confirmado! ✅",
      `${bookingConfig.name} em ${company.name} · ${booking.scheduledDate} às ${booking.scheduledStartTime}`,
      { bookingId, screen: "booking-detail" }
    );
  } catch (err) {
    console.error("[notifications] notifyBookingConfirmed failed:", err);
  }
}

export async function notifyBookingReminder(bookingId: string) {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: { select: { name: true, locale: true } },
        bookingConfig: { select: { name: true } },
        customerDetail: true,
        estimate: { select: { customerId: true } },
      },
    });
    if (!booking?.customerDetail) return;

    const { customerDetail: cd, company, bookingConfig } = booking;
    if (!cd.sendReminders) return;

    const address = `${cd.address}${cd.aptNo ? `, ${cd.aptNo}` : ""}, ${cd.city}`;
    const customerName = `${cd.firstName} ${cd.lastName}`;
    const locale = company.locale ?? "pt-BR";

    await sendBookingReminderEmail({
      to: cd.email,
      customerName,
      companyName: company.name,
      serviceName: bookingConfig.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
      endTime: booking.scheduledEndTime,
      address,
      locale,
    });

    void sendBookingReminderWhatsapp({
      phone: cd.phone,
      customerName,
      companyName: company.name,
      serviceName: bookingConfig.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
    });

    void sendBookingReminderSms({
      phone: cd.phone,
      customerName,
      companyName: company.name,
      serviceName: bookingConfig.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
      locale,
    });

    const tokens = await getUserPushTokens(booking.estimate?.customerId);
    await sendPushNotifications(
      tokens,
      "🔔 Lembrete para amanhã",
      `${bookingConfig.name} em ${company.name} às ${booking.scheduledStartTime}`,
      { bookingId, screen: "booking-detail" }
    );
  } catch (err) {
    console.error("[notifications] notifyBookingReminder failed:", err);
  }
}

export async function notifyBookingCancelled(bookingId: string) {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: { select: { name: true, locale: true } },
        customerDetail: true,
        estimate: { select: { customerId: true } },
      },
    });
    if (!booking?.customerDetail) return;

    const { customerDetail: cd, company } = booking;
    const locale = company.locale ?? "pt-BR";

    const customerName = `${cd.firstName} ${cd.lastName}`;
    await sendBookingCancelledEmail({
      to: cd.email,
      customerName,
      companyName: company.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
      locale,
    });

    void sendBookingCancelledWhatsapp({
      phone: cd.phone,
      customerName,
      companyName: company.name,
      date: booking.scheduledDate,
    });

    void sendBookingCancelledSms({
      phone: cd.phone,
      customerName,
      companyName: company.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
      locale,
    });

    const tokens = await getUserPushTokens(booking.estimate?.customerId);
    await sendPushNotifications(
      tokens,
      "Agendamento cancelado",
      `Seu agendamento em ${company.name} foi cancelado.`,
      { bookingId, screen: "bookings" }
    );
  } catch (err) {
    console.error("[notifications] notifyBookingCancelled failed:", err);
  }
}

export async function notifyCompanyNewBooking(bookingId: string) {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: {
          select: {
            name: true,
            members: {
              where: { isActive: true, role: { in: ["OWNER", "MANAGER"] } },
              select: { userId: true },
            },
          },
        },
        bookingConfig: { select: { name: true } },
        customerDetail: { select: { firstName: true, lastName: true } },
      },
    });
    if (!booking) return;

    const customerName = booking.customerDetail
      ? `${booking.customerDetail.firstName} ${booking.customerDetail.lastName}`
      : "Cliente";

    // Get push tokens for all company owners/managers
    const userIds = booking.company.members.map((m) => m.userId);
    if (userIds.length === 0) return;

    const tokens = await db.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });

    await sendPushNotifications(
      tokens.map((t) => t.token),
      "Novo agendamento recebido! 📋",
      `${customerName} agendou ${booking.bookingConfig.name} para ${booking.scheduledDate} às ${booking.scheduledStartTime}`,
      { bookingId, screen: "booking-detail" }
    );
  } catch (err) {
    console.error("[notifications] notifyCompanyNewBooking failed:", err);
  }
}

export async function notifyStatusChanged(bookingId: string, newStatus: string) {
  try {
    if (newStatus !== "COMPLETED") return;

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: { select: { name: true } },
        bookingConfig: { select: { name: true } },
        estimate: { select: { customerId: true } },
      },
    });
    if (!booking) return;

    const { company, bookingConfig } = booking;
    const tokens = await getUserPushTokens(booking.estimate?.customerId);

    await sendPushNotifications(
      tokens,
      "Serviço concluído ✅",
      `${bookingConfig.name} em ${company.name} foi finalizado. Que tal avaliar?`,
      { bookingId, screen: "review" }
    );
  } catch (err) {
    console.error("[notifications] notifyStatusChanged failed:", err);
  }
}

export async function notifyBookingCompletedWithInvoice(
  bookingId: string,
  basePrice: number,
  additionalItems: Array<{ description: string; amount: number }>,
  discountAmount: number,
  finalTotal: number
) {
  try {
    const { sendBookingCompletedInvoiceEmail } = await import("./email");
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: { select: { name: true, phone: true, currency: true } },
        bookingConfig: { select: { name: true } },
        customerDetail: true,
      },
    });
    if (!booking?.customerDetail) return;

    const cd = booking.customerDetail;
    const address = `${cd.address}${cd.aptNo ? `, ${cd.aptNo}` : ""}, ${cd.city}`;
    const customerName = `${cd.firstName} ${cd.lastName}`;

    await sendBookingCompletedInvoiceEmail({
      to: cd.email,
      customerName,
      companyName: booking.company.name,
      companyPhone: booking.company.phone,
      serviceName: booking.bookingConfig.name,
      bookingId: booking.id,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
      endTime: booking.scheduledEndTime,
      address,
      currency: booking.company.currency,
      basePrice,
      additionalItems,
      discountAmount,
      finalTotal,
    });

    const { awardLoyaltyPointsForBooking } = await import("@/lib/loyalty");
    void awardLoyaltyPointsForBooking(bookingId, finalTotal);
  } catch (err) {
    console.error("[notifications] notifyBookingCompletedWithInvoice failed:", err);
  }
}

/**
 * Pedido de avaliação — enviado depois do atendimento, com link assinado.
 *
 * Idempotente por `booking.reviewRequestedAt`: a fila de saída reprocessa em
 * falha, e sem esta marca o cliente receberia o mesmo pedido a cada tentativa.
 */
export async function notifyReviewRequest(bookingId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      companyId: true,
      status: true,
      reviewRequestedAt: true,
      company: { select: { name: true, slug: true, logoUrl: true } },
      bookingConfig: { select: { name: true } },
      customerDetail: { select: { firstName: true, email: true, sendReminders: true } },
      review: { select: { id: true } },
    },
  });

  if (!booking) return;
  if (booking.status !== "COMPLETED") return;
  if (booking.reviewRequestedAt) return;
  if (booking.review) return;
  // Sem e-mail não há como pedir; e quem desmarcou os lembretes não pediu para
  // ser procurado. Pedido de avaliação é comunicação de serviço, mas respeitar
  // a única escolha que o cliente fez ali é o mínimo.
  if (!booking.customerDetail?.email || !booking.customerDetail.sendReminders) return;

  const expires =
    Math.floor(Date.now() / 1000) + REVIEW_LINK_TTL_DAYS * 24 * 60 * 60;
  const token = generateSignedReviewToken(booking.id, booking.companyId, expires);
  const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const reviewUrl = `${appUrl}/avaliar/${booking.id}?t=${token}&e=${expires}`;

  await sendReviewRequestEmail({
    to: booking.customerDetail.email,
    customerName: booking.customerDetail.firstName || "Cliente",
    companyName: booking.company.name,
    companyLogoUrl: booking.company.logoUrl,
    serviceName: booking.bookingConfig.name,
    reviewUrl,
  });

  // Marcado só depois do envio: falha antes daqui deixa a fila tentar de novo.
  await db.booking.update({
    where: { id: booking.id },
    data: { reviewRequestedAt: new Date() },
  });
}
