"use client";

import { useState, useRef } from "react";
import {
  MONTH_NAMES,
  DAY_ABBREVS,
  getMonthCells,
  toDateString,
  parseLocalDate,
} from "@/lib/calendar";

type Props = {
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (date: string) => void;
};

export function MiniCalendar({ selectedDate, onSelectDate }: Props) {
  const d = parseLocalDate(selectedDate);
  const [viewYear, setViewYear] = useState(d.getFullYear());
  const [viewMonth, setViewMonth] = useState(d.getMonth());
  const [focusedDate, setFocusedDate] = useState(selectedDate);
  const gridRef = useRef<HTMLTableSectionElement>(null);

  const cells = getMonthCells(viewYear, viewMonth);
  const today = toDateString(new Date());
  const titleId = "mini-cal-title";

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function focusDate(dateStr: string) {
    setFocusedDate(dateStr);
    const d2 = parseLocalDate(dateStr);
    setViewYear(d2.getFullYear());
    setViewMonth(d2.getMonth());
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLElement>(`[data-cal="${dateStr}"]`)
        ?.focus();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent, dateStr: string) {
    const cur = parseLocalDate(dateStr);
    let next: Date | null = null;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        next = new Date(cur);
        next.setDate(cur.getDate() - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        next = new Date(cur);
        next.setDate(cur.getDate() + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        next = new Date(cur);
        next.setDate(cur.getDate() - 7);
        break;
      case "ArrowDown":
        e.preventDefault();
        next = new Date(cur);
        next.setDate(cur.getDate() + 7);
        break;
      case "PageUp":
        e.preventDefault();
        next = new Date(cur);
        next.setMonth(cur.getMonth() - 1);
        break;
      case "PageDown":
        e.preventDefault();
        next = new Date(cur);
        next.setMonth(cur.getMonth() + 1);
        break;
      case "Home":
        e.preventDefault();
        next = new Date(cur.getFullYear(), cur.getMonth(), 1);
        break;
      case "End":
        e.preventDefault();
        next = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onSelectDate(dateStr);
        return;
    }

    if (next) focusDate(toDateString(next));
  }

  return (
    <div className="select-none px-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Mês anterior"
          className="p-1 rounded hover:bg-[var(--color-bg-muted)] text-[var(--color-text-subtle)] hover:text-[var(--color-text-heading)] leading-none"
        >
          ‹
        </button>
        <span
          id={titleId}
          className="text-xs font-semibold text-[var(--color-text-heading)]"
          aria-live="polite"
          aria-atomic="true"
        >
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          aria-label="Próximo mês"
          className="p-1 rounded hover:bg-[var(--color-bg-muted)] text-[var(--color-text-subtle)] hover:text-[var(--color-text-heading)] leading-none"
        >
          ›
        </button>
      </div>

      {/* Grid */}
      <table
        role="grid"
        aria-labelledby={titleId}
        className="w-full table-fixed border-collapse"
      >
        <thead>
          <tr role="row">
            {DAY_ABBREVS.map((abbr) => (
              <th
                key={abbr}
                scope="col"
                className="text-center text-[var(--text-2xs)] font-medium text-[var(--color-text-subtle)] pb-1"
                aria-label={abbr}
              >
                {abbr}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role="rowgroup" ref={gridRef}>
          {Array.from({ length: Math.ceil(cells.length / 7) }).map(
            (_, rowIdx) => (
              <tr key={rowIdx} role="row">
                {cells
                  .slice(rowIdx * 7, rowIdx * 7 + 7)
                  .map(({ date, isCurrentMonth }) => {
                    const dateStr = toDateString(date);
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === today;

                    return (
                      <td
                        key={dateStr}
                        role="gridcell"
                        aria-selected={isSelected}
                        className="text-center p-0"
                      >
                        <button
                          type="button"
                          tabIndex={dateStr === focusedDate ? 0 : -1}
                          data-cal={dateStr}
                          onClick={() => onSelectDate(dateStr)}
                          onKeyDown={(e) => handleKeyDown(e, dateStr)}
                          aria-label={date.toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                          aria-current={isToday ? "date" : undefined}
                          className={[
                            "w-7 h-7 text-xs rounded-full transition-colors mx-auto flex items-center justify-center",
                            isSelected
                              ? "bg-[var(--color-primary)] text-white font-semibold"
                              : isToday
                              ? "border border-[var(--color-primary)] text-[var(--color-primary)] font-semibold hover:bg-[var(--color-primary-light)]"
                              : isCurrentMonth
                              ? "text-[var(--color-text-heading)] hover:bg-[var(--color-bg-muted)]"
                              : "text-[var(--color-text-subtle)] opacity-50",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {date.getDate()}
                        </button>
                      </td>
                    );
                  })}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
