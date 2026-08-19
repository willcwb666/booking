"use server";

import "server-only";
import { db } from "@/lib/db";
import { calculateGhostSlotDiscount, type GhostSlotOffer } from "@/lib/agenda/ghost-slot-buster";

/**
 * Busca ofertas relâmpago de última hora ativas para preenchimento de desistências
 */
export async function getActiveGhostSlotsAction(
  companySlug: string
): Promise<{ success: boolean; data: GhostSlotOffer[] }> {
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
