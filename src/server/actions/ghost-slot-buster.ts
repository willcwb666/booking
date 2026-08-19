"use server";

import "server-only";
import { db } from "@/lib/db";
import { calculateGhostSlotDiscount, type GhostSlotOffer } from "@/lib/agenda/ghost-slot-buster";

import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { headers } from "next/headers";
/**
 * Busca ofertas relâmpago de última hora ativas para preenchimento de desistências
 */
export async function getActiveGhostSlotsAction(
  companySlug: string
): Promise<{ success: boolean; data: GhostSlotOffer[] }> {
  // Endpoint público: sem sessão para responsabilizar, o limite de taxa é a
  // única barreira contra abuso e enumeração.
  const rlIp =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.PUBLIC_COMPANY_INFO, rlIp);
  if (!rl.allowed) return { success: false, data: [] };

  try {
    const company = await db.company.findUnique({
      where: { slug: companySlug },
      select: {
        id: true,
        professionals: { select: { id: true, name: true } },
      },
    });

    if (!company) {
      return { success: true, data: [] };
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Busca agendamentos cancelados hoje
    const cancelledBookings = await db.booking.findMany({
      where: {
        companyId: company.id,
        scheduledDate: todayStr,
        status: "CANCELLED",
      },
      include: {
        professional: { select: { id: true, name: true } },
        estimate: { select: { total: true } },
      },
      take: 5,
    });

    const now = new Date();
    const offers: GhostSlotOffer[] = [];

    for (const b of cancelledBookings) {
      const slotDateTime = new Date(`${b.scheduledDate}T${b.scheduledStartTime}:00`);
      const basePrice = Number(b.estimate?.total || 75);
      const evalResult = calculateGhostSlotDiscount(slotDateTime, now, basePrice);

      if (evalResult.isGhostSlot && b.professional) {
        offers.push({
          bookingId: b.id,
          professionalId: b.professional.id,
          professionalName: b.professional.name,
          date: b.scheduledDate,
          startTime: b.scheduledStartTime,
          endTime: b.scheduledEndTime,
          originalPrice: basePrice,
          discountPercentage: evalResult.discountPercentage,
          flashPrice: evalResult.flashPrice,
          minutesUntilStart: evalResult.minutesUntilStart,
          expiresInMinutes: evalResult.minutesUntilStart,
        });
      }
    }

    return { success: true, data: offers };
  } catch (error) {
    console.error("[GHOST_SLOT_ERROR]", error);
    return { success: true, data: [] };
  }
}
