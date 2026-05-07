import "server-only";
import { db } from "./db";
import { sendBookingConfirmationEmail, sendBookingReminderEmail, sendBookingCancelledEmail } from "./email";
import { sendPushNotifications } from "./push";

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
        company: { select: { name: true } },
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

    await sendBookingConfirmationEmail({
      to: cd.email,
      customerName,
      companyName: company.name,
      serviceName: bookingConfig.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
      endTime: booking.scheduledEndTime,
      address,
    });

    const tokens = await getUserPushTokens(booking.estimate.customerId);
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
        company: { select: { name: true } },
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

    await sendBookingReminderEmail({
      to: cd.email,
      customerName,
      companyName: company.name,
      serviceName: bookingConfig.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
      endTime: booking.scheduledEndTime,
      address,
    });

    const tokens = await getUserPushTokens(booking.estimate.customerId);
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
        company: { select: { name: true } },
        customerDetail: true,
        estimate: { select: { customerId: true } },
      },
    });
    if (!booking?.customerDetail) return;

    const { customerDetail: cd, company } = booking;

    await sendBookingCancelledEmail({
      to: cd.email,
      customerName: `${cd.firstName} ${cd.lastName}`,
      companyName: company.name,
      date: booking.scheduledDate,
      startTime: booking.scheduledStartTime,
    });

    const tokens = await getUserPushTokens(booking.estimate.customerId);
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
    const tokens = await getUserPushTokens(booking.estimate.customerId);

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
