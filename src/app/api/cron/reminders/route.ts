import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { notifyBookingReminder } from "@/lib/notifications";

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

  let sent24h = 0;
  let sent2h = 0;
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

    // 24h reminders — bookings happening tomorrow (no fuso da empresa)
    const tomorrowBookings = await db.booking.findMany({
      where: {
        scheduledDate: tomorrowStr,
        status: { in: ["CONFIRMED", "PENDING"] },
        customerDetail: { sendReminders: true },
        company: { timezone: tz },
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
      },
      select: { id: true },
    });

    const all = [...tomorrowBookings, ...soonBookings];
    await Promise.all(all.map((b) => notifyBookingReminder(b.id)));
    sent24h += tomorrowBookings.length;
    sent2h += soonBookings.length;
  }

  return NextResponse.json({ sent24h, sent2h, timezones: timezones.length });
}
