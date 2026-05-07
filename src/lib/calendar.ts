export type CalendarView = "day" | "week" | "month";

export const GRID_START_HOUR = 6; // 06:00
export const GRID_END_HOUR = 22; // 22:00
export const SLOT_MINUTES = 30;
export const SLOT_HEIGHT = 48; // px per 30-min slot

export const TOTAL_SLOTS =
  ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES;
export const GRID_HEIGHT = TOTAL_SLOTS * SLOT_HEIGHT;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function getSlotTop(time: string): number {
  const minutes = timeToMinutes(time);
  const startMinutes = GRID_START_HOUR * 60;
  return Math.max(0, ((minutes - startMinutes) / SLOT_MINUTES) * SLOT_HEIGHT);
}

export function getEventHeight(startTime: string, endTime: string): number {
  const duration = timeToMinutes(endTime) - timeToMinutes(startTime);
  return Math.max(SLOT_HEIGHT / 2, (duration / SLOT_MINUTES) * SLOT_HEIGHT);
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00");
}

/** Returns Monday–Sunday dates for the ISO week containing `date`. */
export function getWeekDays(date: string): string[] {
  const d = parseLocalDate(date);
  const dow = d.getDay(); // 0=Sun, 1=Mon
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return toDateString(day);
  });
}

/** Returns { from, to } for the given view + selected date. */
export function getDateRange(
  date: string,
  view: CalendarView
): { from: string; to: string } {
  if (view === "day") return { from: date, to: date };
  if (view === "week") {
    const days = getWeekDays(date);
    return { from: days[0], to: days[6] };
  }
  // month
  const d = parseLocalDate(date);
  const from = `${date.slice(0, 7)}-01`;
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const to = `${date.slice(0, 7)}-${lastDay.toString().padStart(2, "0")}`;
  return { from, to };
}

export function navigateDate(
  date: string,
  view: CalendarView,
  direction: -1 | 1
): string {
  const d = parseLocalDate(date);
  if (view === "day") {
    d.setDate(d.getDate() + direction);
  } else if (view === "week") {
    d.setDate(d.getDate() + direction * 7);
  } else {
    d.setMonth(d.getMonth() + direction);
    // clamp to last day of month
    const max = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (d.getDate() > max) d.setDate(max);
  }
  return toDateString(d);
}

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const DAY_ABBREVS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const DAY_FULL = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo",
];

/** Returns all cells for a month view grid (Mon–Sun weeks). */
export function getMonthCells(
  year: number,
  month: number // 0-indexed
): Array<{ date: Date; isCurrentMonth: boolean }> {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Offset so Monday = 0
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;
  const startOffset = startDow - 1;

  const cells: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month, -i), isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
    }
  }
  return cells;
}

export const EVENT_TYPE_CONFIG = {
  APPOINTMENT: {
    label: "Agendamento",
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-400",
    dot: "bg-blue-500",
  },
  EVENT: {
    label: "Evento",
    bg: "bg-violet-100",
    text: "text-violet-800",
    border: "border-violet-400",
    dot: "bg-violet-500",
  },
  ESTIMATE: {
    label: "Estimate",
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-400",
    dot: "bg-orange-500",
  },
} as const;
