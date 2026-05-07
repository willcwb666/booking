"use server";

import { db } from "@/lib/db";
import { generateSlots, type TimeSlot } from "@/lib/agenda";

export async function getAvailableSlotsAction(
  agendaId: string,
  date: string
): Promise<TimeSlot[]> {
  const agenda = await db.agenda.findFirst({
    where: { id: agendaId, status: "ACTIVE" },
  });
  if (!agenda) return [];

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
  if (allSlots.length === 0) return [];

  const booked = await db.bookingSlot.findMany({
    where: { agendaId, date },
    select: { startTime: true },
  });
  const bookedTimes = new Set(booked.map((s) => s.startTime));

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return allSlots.filter((slot) => {
    if (bookedTimes.has(slot.startTime)) return false;
    if (date === today && slot.startTime <= currentTime) return false;
    return true;
  });
}
