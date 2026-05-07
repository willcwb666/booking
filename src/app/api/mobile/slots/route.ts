import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSlots } from "@/lib/agenda";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agendaId = searchParams.get("agendaId");
  const date = searchParams.get("date");

  if (!agendaId || !date) {
    return NextResponse.json({ error: "Parâmetros agendaId e date são obrigatórios" }, { status: 400 });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Formato de data inválido. Use YYYY-MM-DD" }, { status: 400 });
  }

  const agenda = await db.agenda.findFirst({
    where: { id: agendaId, status: "ACTIVE" },
  });
  if (!agenda) {
    return NextResponse.json([], { status: 200 });
  }

  const allSlots = generateSlots(
    {
      startDate: agenda.startDate,
      endDate: agenda.endDate,
      workingDays: agenda.workingDays,
      startTime: agenda.startTime,
      endTime: agenda.endTime,
      intervalMinutes: agenda.intervalMinutes,
    },
    date
  );

  if (allSlots.length === 0) {
    return NextResponse.json([]);
  }

  // Filter out already booked slots
  const booked = await db.bookingSlot.findMany({
    where: { agendaId, date },
    select: { startTime: true },
  });
  const bookedTimes = new Set(booked.map((s) => s.startTime));

  // Filter out past times if date is today
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const available = allSlots.filter((slot) => {
    if (bookedTimes.has(slot.startTime)) return false;
    if (date === today && slot.startTime <= currentTime) return false;
    return true;
  });

  return NextResponse.json(available);
}
