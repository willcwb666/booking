import "server-only";
import { db } from "@/lib/db";

export async function getScheduleEvents(
  companyId: string,
  from: string,
  to: string,
  professionalId?: string
) {
  const [manualEvents, bookings] = await Promise.all([
    db.scheduleEvent.findMany({
      where: {
        companyId,
        date: { gte: from, lte: to },
        ...(professionalId ? { professionalId } : {}),
      },
      include: {
        professional: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    db.booking.findMany({
      where: {
        companyId,
        scheduledDate: { gte: from, lte: to },
        status: { notIn: ["CANCELLED"] },
        ...(professionalId ? { professionalId } : {}),
      },
      include: {
        professional: { select: { id: true, name: true } },
        customerDetail: { select: { firstName: true, lastName: true, phone: true } },
        estimate: {
          include: {
            serviceTypes: { include: { serviceType: { select: { name: true } } } },
          },
        },
      },
      orderBy: [{ scheduledDate: "asc" }, { scheduledStartTime: "asc" }],
    }),
  ]);

  const bookingEvents = bookings.map((b) => {
    const customerName = b.customerDetail
      ? `${b.customerDetail.firstName} ${b.customerDetail.lastName}`.trim()
      : "Cliente";

    const serviceNames =
      b.estimate?.serviceTypes?.map((s) => s.serviceType.name).join(", ") ||
      "Atendimento";

    const title = `${customerName} • ${serviceNames}`;

    return {
      id: b.id,
      title,
      type: "APPOINTMENT" as const,
      date: b.scheduledDate,
      startTime: b.scheduledStartTime,
      endTime: b.scheduledEndTime,
      notes: `Status: ${b.status} | Telefone: ${b.customerDetail?.phone || "-"}`,
      professional: b.professional
        ? { id: b.professional.id, name: b.professional.name }
        : null,
      createdBy: { id: b.id, name: "Agendamento Online" },
      bookingId: b.id,
      status: b.status,
    };
  });

  const combined = [
    ...manualEvents.map((e) => ({
      ...e,
      bookingId: undefined as string | undefined,
      status: undefined as string | undefined,
    })),
    ...bookingEvents,
  ];

  return combined.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });
}
