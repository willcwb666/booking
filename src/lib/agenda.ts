import "server-only";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";

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

export type AgendaExceptionInfo = {
  type: "BLOCKED_DAY" | "CUSTOM_HOURS";
  startTime: string | null;
  endTime: string | null;
};

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateSlots(
  config: AgendaConfig,
  targetDate: string,
  exception?: AgendaExceptionInfo | null
): TimeSlot[] {
  if (targetDate < config.startDate) return [];
  if (config.endDate && targetDate > config.endDate) return [];
  if (exception?.type === "BLOCKED_DAY") return [];

  // CUSTOM_HOURS substitui o horário do dia (e abre o dia mesmo fora de workingDays)
  const customHours =
    exception?.type === "CUSTOM_HOURS" && exception.startTime && exception.endTime
      ? { startTime: exception.startTime, endTime: exception.endTime }
      : null;

  if (!customHours) {
    // Parse day-of-week from "YYYY-MM-DD" without timezone issues
    const [year, month, day] = targetDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay(); // 0=Sun … 6=Sat

    if (!config.workingDays.includes(dayOfWeek)) return [];
  }

  const [startH, startM] = (customHours?.startTime ?? config.startTime).split(":").map(Number);
  const [endH, endM] = (customHours?.endTime ?? config.endTime).split(":").map(Number);
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

/**
 * Slots disponíveis de uma agenda ativa em uma data: grade da agenda,
 * menos exceções (dia bloqueado / horário especial), menos slots já
 * reservados pelo profissional (ou por todos os profissionais da equipe),
 * menos horários já passados (quando a data é hoje).
 */
export async function getAvailableSlots(
  agendaId: string,
  date: string,
  professionalId?: string | null
): Promise<TimeSlot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const agenda = await db.agenda.findFirst({
    where: { id: agendaId, status: "ACTIVE" },
    include: {
      professionals: {
        include: { professional: true },
      },
    },
  });
  if (!agenda) return [];

  const exception = await db.agendaException.findUnique({
    where: { agendaId_date: { agendaId, date } },
    select: { type: true, startTime: true, endTime: true },
  });

  const allSlots = generateSlots(
    {
      startDate: agenda.startDate,
      endDate: agenda.endDate,
      workingDays: agenda.workingDays,
      startTime: agenda.startTime,
      endTime: agenda.endTime,
      intervalMinutes: agenda.intervalMinutes,
    },
    date,
    exception
  );
  if (allSlots.length === 0) return [];

  // Se um profissional específico foi escolhido:
  if (professionalId) {
    const [bookedForProf, scheduleEvents] = await Promise.all([
      db.booking.findMany({
        where: {
          agendaId,
          scheduledDate: date,
          professionalId,
          status: { notIn: ["CANCELLED"] },
        },
        select: { scheduledStartTime: true, scheduledEndTime: true },
      }),
      db.scheduleEvent.findMany({
        where: {
          companyId: agenda.companyId,
          professionalId,
          date,
        },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const bookedTimes = new Set(bookedForProf.map((b) => b.scheduledStartTime));

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    return allSlots.filter((slot) => {
      // 1. Bloqueio por agendamento existente
      if (bookedTimes.has(slot.startTime)) return false;

      // 2. Bloqueio por evento externo (Google Calendar / iCal / Bloqueio Manual)
      for (const ev of scheduleEvents) {
        if (slot.startTime < ev.endTime && slot.endTime > ev.startTime) {
          return false;
        }
      }

      // 3. Horário já passado hoje
      if (date === today && slot.startTime <= currentTime) return false;
      return true;
    });
  }

  // Se "Qualquer Profissional" (auto-assignment):
  // Um horário só é bloqueado se TODOS os profissionais ativos da agenda estiverem ocupados naquele horário.
  const activeStaff = agenda.professionals.filter((p) => p.professional.isActive);
  const activeStaffCount = Math.max(1, activeStaff.length);
  const activeProfIds = activeStaff.map((p) => p.professionalId);

  const [bookingsOnDate, externalEventsOnDate] = await Promise.all([
    db.booking.findMany({
      where: {
        agendaId,
        scheduledDate: date,
        status: { notIn: ["CANCELLED"] },
      },
      select: { scheduledStartTime: true, professionalId: true },
    }),
    db.scheduleEvent.findMany({
      where: {
        companyId: agenda.companyId,
        professionalId: { in: activeProfIds },
        date,
      },
      select: { startTime: true, endTime: true, professionalId: true },
    }),
  ]);

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return allSlots.filter((slot) => {
    // Conta quantos profissionais estão ocupados neste slot (seja por booking ou por evento externo)
    let busyProfCount = 0;

    for (const profId of activeProfIds) {
      const isBooked = bookingsOnDate.some(
        (b) => b.professionalId === profId && b.scheduledStartTime === slot.startTime
      );
      if (isBooked) {
        busyProfCount++;
        continue;
      }

      const hasEvent = externalEventsOnDate.some(
        (ev) => ev.professionalId === profId && slot.startTime < ev.endTime && slot.endTime > ev.startTime
      );
      if (hasEvent) {
        busyProfCount++;
      }
    }

    if (busyProfCount >= activeStaffCount) return false;
    if (date === today && slot.startTime <= currentTime) return false;
    return true;
  });
}

/**
 * Valida no servidor um horário enviado pelo cliente: precisa coincidir
 * exatamente com um slot disponível da grade (impede horários arbitrários,
 * overlaps, dias bloqueados e datas fora da agenda).
 */
export async function isSlotAvailable(
  agendaId: string,
  date: string,
  startTime: string,
  endTime: string,
  professionalId?: string | null
): Promise<boolean> {
  const available = await getAvailableSlots(agendaId, date, professionalId);
  return available.some((s) => s.startTime === startTime && s.endTime === endTime);
}

export async function invalidateSlotCache(agendaId: string): Promise<void> {
  try {
    const keys = await redis.keys(`slots:${agendaId}:*`);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Redis unavailable — cache will expire naturally
  }
}
