"use client";

import {
  GRID_START_HOUR,
  GRID_END_HOUR,
  SLOT_MINUTES,
  SLOT_HEIGHT,
  TOTAL_SLOTS,
  GRID_HEIGHT,
  getSlotTop,
  getEventHeight,
  minutesToTime,
  EVENT_TYPE_CONFIG,
  DAY_ABBREVS,
  MONTH_NAMES,
  parseLocalDate,
} from "@/lib/calendar";

type ScheduleEvent = {
  id: string;
  title: string;
  type: "APPOINTMENT" | "EVENT" | "ESTIMATE";
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  professional: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
};

type Props = {
  view: "day" | "week";
  days: string[]; // "YYYY-MM-DD" — 1 item for day, 7 for week
  events: ScheduleEvent[];
  onSlotClick: (date: string, time: string) => void;
  onEventClick: (event: ScheduleEvent) => void;
};

const TIME_COL_W = 56; // px

function formatDayHeader(dateStr: string): { abbr: string; num: string; full: string } {
  const d = parseLocalDate(dateStr);
  const dow = d.getDay(); // 0=Sun
  const dayIndex = dow === 0 ? 6 : dow - 1; // Mon=0 … Sun=6
  const day = d.getDate().toString();
  const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
  return {
    abbr: DAY_ABBREVS[dayIndex],
    num: day,
    full: `${DAY_ABBREVS[dayIndex]}, ${day} de ${MONTH_NAMES[d.getMonth()]}`,
  };
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}

export function TimeGrid({ view, days, events, onSlotClick, onEventClick }: Props) {
  // Time label rows
  const timeSlots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const minutes = GRID_START_HOUR * 60 + i * SLOT_MINUTES;
    return minutesToTime(minutes);
  });

  // Group events by date
  const eventsByDate: Record<string, ScheduleEvent[]> = {};
  for (const day of days) eventsByDate[day] = [];
  for (const ev of events) {
    if (eventsByDate[ev.date]) eventsByDate[ev.date].push(ev);
  }

  return (
    <div
      className="flex flex-col overflow-hidden h-full"
      role="grid"
      aria-label={`Grade de horários — ${view === "day" ? "dia" : "semana"}`}
    >
      {/* Day headers */}
      <div
        className="flex border-b border-gray-200 bg-white sticky top-0 z-10"
        role="row"
      >
        {/* Time gutter header */}
        <div
          style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
          className="shrink-0"
          aria-hidden="true"
        />
        {days.map((dateStr) => {
          const hdr = formatDayHeader(dateStr);
          const today = isToday(dateStr);
          return (
            <div
              key={dateStr}
              role="columnheader"
              aria-label={hdr.full}
              className={`flex-1 min-w-0 text-center py-2 border-l border-gray-100 ${today ? "bg-blue-50" : ""}`}
            >
              <span className="text-xs text-gray-400 block">{hdr.abbr}</span>
              <span
                className={`text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 ${
                  today ? "bg-blue-600 text-white" : "text-gray-800"
                }`}
              >
                {hdr.num}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable time body */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: GRID_HEIGHT }}>
          {/* Time labels */}
          <div
            style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
            className="shrink-0 relative"
            aria-hidden="true"
          >
            {timeSlots.map((t, i) => (
              <div
                key={t}
                style={{ height: SLOT_HEIGHT, top: i * SLOT_HEIGHT }}
                className="absolute right-2 text-[10px] text-gray-400 leading-none -translate-y-1/2 select-none"
              >
                {i > 0 ? t : ""}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((dateStr) => {
            const dayEvents = eventsByDate[dateStr] ?? [];
            const today = isToday(dateStr);

            return (
              <div
                key={dateStr}
                role="gridcell"
                aria-label={formatDayHeader(dateStr).full}
                className={`flex-1 min-w-0 relative border-l border-gray-100 ${today ? "bg-blue-50/30" : ""}`}
                style={{ height: GRID_HEIGHT }}
              >
                {/* Background grid lines + clickable slots */}
                {timeSlots.map((time, i) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => onSlotClick(dateStr, time)}
                    aria-label={`Criar evento às ${time} em ${formatDayHeader(dateStr).full}`}
                    style={{ height: SLOT_HEIGHT, top: i * SLOT_HEIGHT }}
                    className={`absolute inset-x-0 w-full hover:bg-blue-50/60 transition-colors border-t ${
                      i % 2 === 0 ? "border-gray-100" : "border-gray-50"
                    }`}
                  />
                ))}

                {/* Events */}
                {dayEvents.map((ev) => {
                  const top = getSlotTop(ev.startTime);
                  const height = getEventHeight(ev.startTime, ev.endTime);
                  const cfg = EVENT_TYPE_CONFIG[ev.type];

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(ev);
                      }}
                      aria-label={`${cfg.label}: ${ev.title}, ${ev.startTime} às ${ev.endTime}`}
                      style={{ top, height, left: 4, right: 4 }}
                      className={`absolute rounded-md border-l-2 px-2 py-1 text-left overflow-hidden z-10 shadow-sm hover:shadow transition-shadow ${cfg.bg} ${cfg.text} ${cfg.border}`}
                    >
                      <p className="text-xs font-semibold truncate leading-tight">
                        {ev.title}
                      </p>
                      <p className="text-[10px] opacity-75 truncate">
                        {ev.startTime}–{ev.endTime}
                        {ev.professional && ` · ${ev.professional.name}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
