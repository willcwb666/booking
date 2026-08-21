import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { enqueueNotification, processOutbox } from "@/lib/notification-outbox";
import { purgeExpiredClientPhotos } from "@/lib/vault-purge";

const DEFAULT_TZ = "America/Sao_Paulo";

function getDateInTz(tz: string, offsetDays: number): string {
  const d = new Date();
  const localeDate = new Date(d.toLocaleString("en-US", { timeZone: tz }));
  localeDate.setDate(localeDate.getDate() + offsetDays);
  const y = localeDate.getFullYear();
  const m = String(localeDate.getMonth() + 1).padStart(2, "0");
  const day = String(localeDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authHeader);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Called by cron — sends reminders for bookings happening tomorrow and in 2 hours.
// "Amanhã" e "daqui a 2h" dependem do fuso da empresa (multi-mercado), então o
// processamento é agrupado por timezone distinto.
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const distinctTz = await db.company.findMany({
    where: { isActive: true },
    select: { timezone: true },
    distinct: ["timezone"],
  });
  const timezones = distinctTz.length > 0 ? distinctTz.map((t) => t.timezone) : [DEFAULT_TZ];

  let queued24h = 0;
  let queued2h = 0;
  const now = new Date();

  for (const tz of timezones) {
    let tomorrowStr: string;
    let todayStr: string;
    let nowInTz: Date;
    try {
      tomorrowStr = getDateInTz(tz, 1);
      todayStr = getDateInTz(tz, 0);
      nowInTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    } catch {
      console.error(`[cron/reminders] timezone inválido: ${tz}`);
      continue;
    }

    // Janela de 15 min em torno da marca de 2h para não perder ninguém
    const twoHoursLater = new Date(nowInTz.getTime() + 2 * 60 * 60 * 1000);
    const startHHMM = `${String(twoHoursLater.getHours()).padStart(2, "0")}:${String(twoHoursLater.getMinutes()).padStart(2, "0")}`;
    const windowEnd = new Date(twoHoursLater.getTime() + 15 * 60 * 1000);
    const endHHMM = `${String(windowEnd.getHours()).padStart(2, "0")}:${String(windowEnd.getMinutes()).padStart(2, "0")}`;

    /**
     * `reminder*QueuedAt: null` e a parte que faltava.
     *
     * Sem ela, cada passada do cron enfileirava de novo TODOS os agendamentos
     * de amanha. Com a janela de 2h de 15 minutos — que so faz sentido rodando
     * a cada 15 minutos — isso davam 96 lembretes por agendamento.
     */
    const tomorrowBookings = await db.booking.findMany({
      where: {
        scheduledDate: tomorrowStr,
        status: { in: ["CONFIRMED", "PENDING"] },
        customerDetail: { sendReminders: true },
        company: { timezone: tz },
        reminder24hQueuedAt: null,
      },
      select: { id: true },
    });

    // 2h reminders — bookings happening today within the 2h window
    const soonBookings = await db.booking.findMany({
      where: {
        scheduledDate: todayStr,
        scheduledStartTime: { gte: startHHMM, lte: endHHMM },
        status: { in: ["CONFIRMED"] },
        customerDetail: { sendReminders: true },
        company: { timezone: tz },
        reminder2hQueuedAt: null,
      },
      select: { id: true },
    });

    // Enfileira em vez de enviar direto: se o provedor de e-mail estiver fora
    // no momento do cron, o lembrete é reenviado na próxima passada em vez de
    // se perder. Antes, um `Promise.all` de envios diretos jogava fora tudo
    // que falhasse.
    /**
     * Marca ANTES de enfileirar, e com `updateMany` condicionado ao nulo.
     *
     * Antes: se dois workers rodassem juntos, os dois liam a mesma lista e os
     * dois enfileiravam. A escrita condicional resolve — quem marcar primeiro
     * leva, e `count` diz quem foi. Marcar depois de enfileirar deixaria a
     * mesma janela aberta.
     */
    for (const b of tomorrowBookings) {
      const claim = await db.booking.updateMany({
        where: { id: b.id, reminder24hQueuedAt: null },
        data: { reminder24hQueuedAt: new Date() },
      });
      if (claim.count === 0) continue;
      await enqueueNotification({ kind: "BOOKING_REMINDER", bookingId: b.id });
      queued24h++;
    }

    for (const b of soonBookings) {
      const claim = await db.booking.updateMany({
        where: { id: b.id, reminder2hQueuedAt: null },
        data: { reminder2hQueuedAt: new Date() },
      });
      if (claim.count === 0) continue;
      await enqueueNotification({ kind: "BOOKING_REMINDER", bookingId: b.id });
      queued2h++;
    }
  }

  // Drena a fila na mesma execução — inclui o que ficou de rodadas anteriores.
  const outbox = await processOutbox(100);

  /**
   * Expurgo das fotos de cliente com prazo vencido.
   *
   * Pega carona neste cron em vez de ganhar um agendador próprio. Retenção não
   * é urgente — uma passada por dia cumpre a promessa —, e um segundo
   * agendador seria mais uma coisa para configurar em cada ambiente e mais uma
   * para descobrir que nunca foi ligada.
   *
   * Falha aqui não pode derrubar os lembretes, que são a razão desta rota.
   */
  let vault = { deleted: 0, failed: 0 };
  try {
    vault = await purgeExpiredClientPhotos(100);
  } catch (err) {
    console.error("[cron/reminders] expurgo do cofre falhou:", err);
  }

  return NextResponse.json({
    queued24h,
    queued2h,
    timezones: timezones.length,
    outbox,
    vault,
  });
}
