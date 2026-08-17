"use client";

import {
  getMonthCells,
  toDateString,
  MONTH_NAMES,
  DAY_ABBREVS,
  EVENT_TYPE_CONFIG,
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
  bookingId?: string | null;
};

type Props = {
  selectedDate: string; // "YYYY-MM-DD"
  events: ScheduleEvent[];
  onSelectDate: (date: string) => void;
  onEventClick: (event: ScheduleEvent) => void;
};

export function MonthView({
  selectedDate,
  events,
  onSelectDate,
  onEventClick,
}: Props) {
  const d = new Date(selectedDate + "T12:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
  const cells = getMonthCells(year, month);
  const today = toDateString(new Date());
  const titleId = "month-view-title";

  // Group events by date
  const eventsByDate: Record<string, ScheduleEvent[]> = {};
  for (const ev of events) {
    if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
    eventsByDate[ev.date].push(ev);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="text-center py-2 border-b border-[var(--color-border)]">
        <span id={titleId} className="text-sm font-semibold text-[var(--color-text-heading)]">
          {MONTH_NAMES[month]} {year}
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table
          role="grid"
          aria-labelledby={titleId}
          className="w-full h-full table-fixed border-collapse"
        >
          <thead>
            <tr role="row">
              {DAY_ABBREVS.map((abbr) => (
                <th
                  key={abbr}
                  scope="col"
                  className="text-center text-xs font-medium text-[var(--color-text-subtle)] py-2 border-b border-[var(--color-border)]"
                >
                  {abbr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {Array.from({ length: Math.ceil(cells.length / 7) }).map(
              (_, rowIdx) => (
                <tr key={rowIdx} role="row" className="h-24 align-top">
                  {cells
                    .slice(rowIdx * 7, rowIdx * 7 + 7)
                    .map(({ date, isCurrentMonth }) => {
                      const dateStr = toDateString(date);
                      const isSelected = dateStr === selectedDate;
                      const isToday = dateStr === today;
                      const dayEvents = eventsByDate[dateStr] ?? [];

                      return (
                        <td
                          key={dateStr}
                          role="gridcell"
                          aria-selected={isSelected}
                          aria-label={`${date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}, ${dayEvents.length} evento(s)`}
                          className={`border border-[var(--color-border)] p-1 cursor-pointer hover:bg-[var(--color-bg-subtle)] align-top ${
                            !isCurrentMonth ? "bg-[var(--color-bg-subtle)]/50" : ""
                          } ${isSelected ? "ring-2 ring-inset ring-[var(--color-primary)]" : ""}`}
                          onClick={() => onSelectDate(dateStr)}
                        >
                          {/* Day number */}
                          <div
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs mb-1 ${
                              isToday
                                ? "bg-[var(--color-primary)] text-white font-semibold"
                                : isCurrentMonth
                                ? "text-[var(--color-text-heading)]"
                                : "text-[var(--color-text-subtle)] opacity-50"
                            }`}
                          >
                            {date.getDate()}
                          </div>

                          {/* Events (max 3 visible) */}
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map((ev) => {
                              const cfg = EVENT_TYPE_CONFIG[ev.type];
                              return (
                                <button
                                  key={ev.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEventClick(ev);
                                  }}
                                  aria-label={`${cfg.label}: ${ev.title}`}
                                  className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${cfg.bg} ${cfg.text}`}
                                >
                                  {ev.title}
                                </button>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <p className="text-[10px] text-[var(--color-text-subtle)] pl-1">
                                +{dayEvents.length - 3} mais
                              </p>
                            )}
                          </div>
                        </td>
                      );
                    })}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
