"use server";

import { getAvailableStartSlots, type TimeSlot } from "@/lib/agenda";

import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { headers } from "next/headers";
export async function getAvailableSlotsAction(
  agendaId: string,
  date: string,
  professionalId?: string | null,
  /**
   * Quantos slots o atendimento ocupa.
   *
   * Vem do orçamento, calculado na página. A grade precisa oferecer só os
   * horários onde a corrida INTEIRA cabe — oferecer o primeiro slot de um
   * atendimento de 90 minutos às 17:30, com a casa fechando às 18:00, é
   * vender um horário que não existe.
   *
   * O servidor valida de novo na criação, com a duração recalculada do
   * orçamento: este parâmetro só melhora o que a tela mostra, nunca é a
   * autoridade sobre o que pode ser vendido.
   */
  slotsNeeded = 1
): Promise<TimeSlot[]> {
  // Endpoint público: sem sessão para responsabilizar, o limite de taxa é a
  // única barreira contra abuso e enumeração.
  const rlIp =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.PUBLIC_COMPANY_INFO, rlIp);
  // Sem horário disponível é a resposta segura: melhor o cliente tentar de
  // novo em um minuto do que abrir um cálculo de agenda por requisição.
  if (!rl.allowed) return [];

  return getAvailableStartSlots(agendaId, date, professionalId, Math.max(1, slotsNeeded));
}
