"use server";

import { getAvailableSlots, type TimeSlot } from "@/lib/agenda";

import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { headers } from "next/headers";
export async function getAvailableSlotsAction(
  agendaId: string,
  date: string,
  professionalId?: string | null
): Promise<TimeSlot[]> {
  // Endpoint público: sem sessão para responsabilizar, o limite de taxa é a
  // única barreira contra abuso e enumeração.
  const rlIp =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.PUBLIC_COMPANY_INFO, rlIp);
  // Sem horário disponível é a resposta segura: melhor o cliente tentar de
  // novo em um minuto do que abrir um cálculo de agenda por requisição.
  if (!rl.allowed) return [];

  return getAvailableSlots(agendaId, date, professionalId);
}
