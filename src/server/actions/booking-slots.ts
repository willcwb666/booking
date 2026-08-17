"use server";

import { getAvailableSlots, type TimeSlot } from "@/lib/agenda";

export async function getAvailableSlotsAction(
  agendaId: string,
  date: string,
  professionalId?: string | null
): Promise<TimeSlot[]> {
  return getAvailableSlots(agendaId, date, professionalId);
}
