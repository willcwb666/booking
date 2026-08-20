"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { canAccessCompany } from "@/lib/admin-guard";
import { getActiveSession } from "@/lib/session";
import { logAuditEvent } from "@/lib/audit-log";
import { restoreBookingCredits } from "@/lib/booking-reversal";
import { safeRefreshTravelBlocks } from "@/lib/geo/travel-blocks";
import { todayInTimezone } from "@/lib/company-date";

/**
 * Cancelar o que resta de uma série recorrente.
 *
 * ─── O que esta action NÃO faz ───────────────────────────────────────────────
 *
 * Não toca no passado. O atendimento de três semanas atrás foi prestado; se
 * estiver concluído, tem comissão carimbada e pode ter gerado pontos. Cancelar
 * retroativamente reescreveria dinheiro já pago.
 *
 * Não estorna cartão. Na série criada por `createBookingAction`, só a PRIMEIRA
 * ocorrência carrega o `PaymentIntent` — as demais nascem com pagamento
 * pendente e nunca foram cobradas. Emitir estorno por elas devolveria dinheiro
 * que não entrou. O estorno da primeira, se for o caso, continua sendo o botão
 * de cancelar daquela ocorrência.
 *
 * Devolve, sim, os créditos que cada ocorrência tenha consumido — vale-presente
 * e sessão de plano — pela mesma função do cancelamento avulso.
 */

type Result =
  | { success: true; cancelled: number }
  | { success: false; error: string };

export async function cancelRecurrenceSeriesAction(
  companySlug: string,
  bookingId: string,
  reason?: string
): Promise<Result> {
  const access = await canAccessCompany(companySlug);
  if (!access.ok) return { success: false, error: access.error };

  const session = await getActiveSession();
  if (!session) return { success: false, error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: { companyId: access.companyId, userId: session.user.id, isActive: true },
    select: { role: true },
  });
  const isPlatformAdmin = session.user.role === "admin";
  if (!isPlatformAdmin && (!member || (member.role !== "OWNER" && member.role !== "MANAGER"))) {
    return { success: false, error: "Sem permissão" };
  }

  // O id vem do navegador: o agendamento precisa ser DESTA empresa.
  const booking = await db.booking.findFirst({
    where: { id: bookingId, companyId: access.companyId },
    select: { recurrenceGroupId: true, company: { select: { timezone: true } } },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado" };
  if (!booking.recurrenceGroupId) {
    return { success: false, error: "Este agendamento não faz parte de uma série." };
  }

  const today = todayInTimezone(booking.company.timezone);

  const targets = await db.booking.findMany({
    where: {
      companyId: access.companyId,
      recurrenceGroupId: booking.recurrenceGroupId,
      scheduledDate: { gte: today },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: { id: true, professionalId: true, scheduledDate: true, agendaId: true },
  });

  if (targets.length === 0) {
    return { success: false, error: "Não há atendimentos futuros nesta série." };
  }

  for (const t of targets) {
    await db.$transaction(async (tx) => {
      // Guarda em `status`: se outra aba já cancelou este, não cancela de novo.
      const updated = await tx.booking.updateMany({
        where: { id: t.id, status: { in: ["PENDING", "CONFIRMED"] } },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: session.user.id,
          cancellationReason: reason?.trim() || "Série recorrente cancelada",
        },
      });
      if (updated.count === 0) return;

      await tx.bookingSlot.deleteMany({ where: { bookingId: t.id } });
      await restoreBookingCredits(tx, t.id);
    });

    // O bloqueio de deslocamento daquele dia perde a parada.
    await safeRefreshTravelBlocks(access.companyId, t.professionalId, t.scheduledDate);
  }

  await logAuditEvent({
    companyId: access.companyId,
    action: "RECURRENCE_SERIES_CANCELLED",
    entity: "Booking",
    details: { groupId: booking.recurrenceGroupId, cancelled: targets.length, from: today },
  });

  revalidatePath(`/${companySlug}/agendamentos`);
  return { success: true, cancelled: targets.length };
}
