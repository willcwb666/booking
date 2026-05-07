import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifyBookingReminder } from "@/lib/notifications";

const TZ = "America/Sao_Paulo";

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

  // Support both Authorization header (preferred) and query param (legacy)
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return false;
}

// Called by cron — sends reminders for bookings happening tomorrow and in 2 hours
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tomorrowStr = getDateInTz(TZ, 1);
  const todayStr = getDateInTz(TZ, 0);

  // Calculate time window for 2-hour reminders (current time + 2h in TZ)
  const now = new Date();
  const nowInTz = new Date(now.toLocaleString("en-US", { timeZone: TZ }));
  const twoHoursLater = new Date(nowInTz.getTime() + 2 * 60 * 60 * 1000);
  const startHHMM = `${String(twoHoursLater.getHours()).padStart(2, "0")}:${String(twoHoursLater.getMinutes()).padStart(2, "0")}`;
  // 15-minute window around the 2h mark to avoid missing anyone
  const windowEnd = new Date(twoHoursLater.getTime() + 15 * 60 * 1000);
  const endHHMM = `${String(windowEnd.getHours()).padStart(2, "0")}:${String(windowEnd.getMinutes()).padStart(2, "0")}`;

  // 24h reminders — bookings happening tomorrow
  const tomorrowBookings = await db.booking.findMany({
    where: {
      scheduledDate: tomorrowStr,
      status: { in: ["CONFIRMED", "PENDING"] },
      customerDetail: { sendReminders: true },
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
    },
    select: { id: true },
  });

  const all = [...tomorrowBookings, ...soonBookings];
  await Promise.all(all.map((b) => notifyBookingReminder(b.id)));

  return NextResponse.json({
    sent24h: tomorrowBookings.length,
    sent2h: soonBookings.length,
    date: tomorrowStr,
  });
}
