import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encrypt";
import { notifyBookingConfirmed, notifyCompanyNewBooking } from "@/lib/notifications";
import { getMobileSession } from "../../_auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await getMobileSession(req);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await rateLimit(`booking:mobile:${session.user.id}`, 10, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um momento." }, { status: 429 });
  }

  let body: {
    estimateId: string;
    agendaId: string;
    scheduledDate: string;
    scheduledStartTime: string;
    scheduledEndTime: string;
    paymentMethod: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    sendReminders: boolean;
    address: string;
    aptNo: string | null;
    city: string;
    zip: string;
    accessType: string;
    keepKeyWithProvider: boolean;
    accessNote: string | null;
    additionalNote: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const {
    estimateId,
    agendaId,
    scheduledDate,
    scheduledStartTime,
    scheduledEndTime,
    firstName,
    lastName,
    email,
    phone,
    sendReminders,
    address,
    aptNo,
    city,
    zip,
    accessType,
    keepKeyWithProvider,
    accessNote: accessNotePlain,
    additionalNote,
  } = body;

  // Validate required fields
  if (!estimateId || !agendaId || !scheduledDate || !scheduledStartTime || !scheduledEndTime) {
    return NextResponse.json({ error: "Dados de agendamento incompletos" }, { status: 400 });
  }
  if (!firstName || !lastName || !email || !phone || !address || !city || !zip) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios" }, { status: 400 });
  }

  // Verify estimate exists, is PENDING, and belongs to this user
  const estimate = await db.estimate.findFirst({
    where: { id: estimateId, status: "PENDING" },
    include: { bookingConfig: true },
  });
  if (!estimate) {
    return NextResponse.json({ error: "Orçamento não encontrado ou expirado" }, { status: 400 });
  }
  if (estimate.customerId !== session.user.id) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  // Verify agenda is active
  const agenda = await db.agenda.findFirst({
    where: { id: agendaId, status: "ACTIVE" },
  });
  if (!agenda) {
    return NextResponse.json({ error: "Agenda não encontrada" }, { status: 400 });
  }

  // Mobile only supports CASH_CHECK
  const paymentMethod = "CASH_CHECK";
  const accessNote = accessNotePlain ? encrypt(accessNotePlain) : null;

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
          status: "CONFIRMED",
          paymentMethod,
          paymentStatus: "PENDING",
        },
      });

      // This may throw P2002 if slot is taken
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
          sendReminders: sendReminders ?? true,
          address,
          aptNo: aptNo || null,
          city,
          zip,
        },
      });

      await tx.bookingHomeAccess.create({
        data: {
          bookingId: newBooking.id,
          accessType: accessType || "someone_home",
          keepKeyWithProvider: keepKeyWithProvider ?? false,
          accessNote,
          additionalNote: additionalNote || null,
        },
      });

      await tx.estimate.update({
        where: { id: estimateId },
        data: { status: "CONVERTED" },
      });

      return newBooking;
    });

    // Fire-and-forget notifications
    void notifyBookingConfirmed(booking.id);
    void notifyCompanyNewBooking(booking.id);

    return NextResponse.json({ bookingId: booking.id });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "Este horário já foi reservado. Por favor, escolha outro horário." },
        { status: 409 }
      );
    }
    throw e;
  }
}
