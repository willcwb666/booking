import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDate(dateStr: string, timeStr: string): string {
  // dateStr: "YYYY-MM-DD", timeStr: "HH:MM"
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
): Promise<NextResponse> {
  const { bookingId } = await params;

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      company: { select: { name: true, address: true } },
      bookingConfig: { select: { name: true } },
      customerDetail: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const uid = `booking-${bookingId}@agendei`;
  const dtStart = toICSDate(booking.scheduledDate, booking.scheduledStartTime);
  const dtEnd = toICSDate(booking.scheduledDate, booking.scheduledEndTime);
  const dtStamp = toICSDate(
    new Date().toISOString().split("T")[0],
    new Date().toISOString().split("T")[1].substring(0, 5)
  );

  const summary = `${booking.bookingConfig.name} — ${booking.company.name}`;
  const description = booking.customerDetail
    ? `Agendamento para ${booking.customerDetail.firstName} ${booking.customerDetail.lastName}`
    : "Agendamento";
  const location = booking.company.address ?? booking.company.name;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//agendei//agendei//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agendamento-${bookingId}.ics"`,
    },
  });
}
