import "server-only";
import { redis } from "@/lib/redis";

export type TimeSlot = {
  date: string;      // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
};

type AgendaConfig = {
  startDate: string;
  endDate: string | null;
  workingDays: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: number;
};

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateSlots(config: AgendaConfig, targetDate: string): TimeSlot[] {
  if (targetDate < config.startDate) return [];
  if (config.endDate && targetDate > config.endDate) return [];

  // Parse day-of-week from "YYYY-MM-DD" without timezone issues
  const [year, month, day] = targetDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay(); // 0=Sun … 6=Sat

  if (!config.workingDays.includes(dayOfWeek)) return [];

  const [startH, startM] = config.startTime.split(":").map(Number);
  const [endH, endM] = config.endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const slots: TimeSlot[] = [];
  for (
    let m = startMinutes;
    m + config.intervalMinutes <= endMinutes;
    m += config.intervalMinutes
  ) {
    slots.push({
      date: targetDate,
      startTime: minutesToTime(m),
      endTime: minutesToTime(m + config.intervalMinutes),
    });
  }
  return slots;
}

export async function getCachedSlots(
  agendaId: string,
  targetDate: string,
  config: AgendaConfig
): Promise<TimeSlot[]> {
  const key = `slots:${agendaId}:${targetDate}`;
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as TimeSlot[];
  } catch {
    // Redis unavailable — fall through to compute
  }

  const slots = generateSlots(config, targetDate);

  try {
    await redis.setex(key, 3600, JSON.stringify(slots));
  } catch {
    // Redis unavailable — return computed result without caching
  }

  return slots;
}

export async function invalidateSlotCache(agendaId: string): Promise<void> {
  try {
    const keys = await redis.keys(`slots:${agendaId}:*`);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Redis unavailable — cache will expire naturally
  }
}
