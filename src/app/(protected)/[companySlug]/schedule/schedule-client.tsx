"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CalendarView } from "@/lib/calendar";
import {
  MONTH_NAMES,
  navigateDate,
  getWeekDays,
  parseLocalDate,
} from "@/lib/calendar";
import { MiniCalendar } from "./_components/mini-calendar";
import { TimeGrid } from "./_components/time-grid";
import { MonthView } from "./_components/month-view";
import { CreateEventDialog } from "./_components/create-event-dialog";
import { EventDetailDialog } from "./_components/event-detail-dialog";

type Professional = { id: string; name: string };

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
  companySlug: string;
  view: CalendarView;
  selectedDate: string;
  selectedProfessional: string;
  professionals: Professional[];
  events: ScheduleEvent[];
  canManage: boolean;
  isOwner: boolean;
};

const VIEW_LABELS: Record<CalendarView, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
};

function getPeriodLabel(view: CalendarView, date: string): string {
  const d = parseLocalDate(date);
  if (view === "day") {
    return d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  if (view === "week") {
    const days = getWeekDays(date);
    const first = parseLocalDate(days[0]);
    const last = parseLocalDate(days[6]);
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()}–${last.getDate()} de ${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${first.getDate()} ${MONTH_NAMES[first.getMonth()].slice(0, 3)} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
  }
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function ScheduleClient({
  companySlug,
  view,
  selectedDate,
  selectedProfessional,
  professionals,
  events,
  canManage,
  isOwner,
}: Props) {
  const router = useRouter();

  const [createDialog, setCreateDialog] = useState<{
    open: boolean;
    date: string;
    time: string;
    professionalId: string;
  }>({ open: false, date: selectedDate, time: "09:00", professionalId: "" });

  const [detailEvent, setDetailEvent] = useState<ScheduleEvent | null>(null);

  function navigate(
    opts: Partial<{
      date: string;
      view: CalendarView;
      professional: string;
    }>
  ) {
    const params = new URLSearchParams({
      date: opts.date ?? selectedDate,
      view: opts.view ?? view,
      professional: opts.professional ?? selectedProfessional,
    });
    router.push(`/${companySlug}/schedule?${params.toString()}`);
  }

  function handlePrev() {
    navigate({ date: navigateDate(selectedDate, view, -1) });
  }

  function handleNext() {
    navigate({ date: navigateDate(selectedDate, view, 1) });
  }

  function handleToday() {
    navigate({ date: new Date().toISOString().split("T")[0] });
  }

  function handleSlotClick(date: string, time: string) {
    if (!canManage) return;
    setCreateDialog({
      open: true,
      date,
      time,
      professionalId:
        selectedProfessional !== "all" ? selectedProfessional : "",
    });
  }

  const gridDays =
    view === "week"
      ? getWeekDays(selectedDate)
      : view === "day"
      ? [selectedDate]
      : [];

  const periodLabel = getPeriodLabel(view, selectedDate);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left panel ── */}
      <aside
        className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto py-4 gap-5"
        aria-label="Painel de navegação do calendário"
      >
        {/* Mini calendar */}
        <div>
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={(d) => navigate({ date: d })}
          />
        </div>

        {/* Professional filter */}
        <div className="px-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Profissional
          </p>
          <ul className="space-y-0.5" role="list">
            <li>
              <button
                type="button"
                onClick={() => navigate({ professional: "all" })}
                aria-pressed={selectedProfessional === "all"}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedProfessional === "all"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Todos
              </button>
            </li>
            {professionals.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => navigate({ professional: p.id })}
                  aria-pressed={selectedProfessional === p.id}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors truncate ${
                    selectedProfessional === p.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Legend */}
        <div className="px-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Legenda
          </p>
          <ul className="space-y-1.5" role="list">
            {(
              [
                { dot: "bg-blue-500", label: "Agendamento" },
                { dot: "bg-violet-500", label: "Evento" },
                { dot: "bg-orange-500", label: "Estimate" },
              ] as const
            ).map(({ dot, label }) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`}
                  aria-hidden="true"
                />
                <span className="text-xs text-gray-600">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white shrink-0 flex-wrap">
          {/* Today */}
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
          >
            Hoje
          </button>

          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Período anterior"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Próximo período"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          {/* Period label */}
          <h1
            className="text-base font-semibold text-gray-900 flex-1 min-w-0 truncate capitalize"
            aria-live="polite"
            aria-atomic="true"
          >
            {periodLabel}
          </h1>

          {/* View switcher */}
          <div
            role="group"
            aria-label="Tipo de visualização"
            className="flex border border-gray-200 rounded-lg overflow-hidden"
          >
            {(["day", "week", "month"] as CalendarView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => navigate({ view: v })}
                aria-pressed={view === v}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          {/* New event button */}
          {canManage && (
            <button
              type="button"
              onClick={() =>
                setCreateDialog({
                  open: true,
                  date: selectedDate,
                  time: "09:00",
                  professionalId:
                    selectedProfessional !== "all" ? selectedProfessional : "",
                })
              }
              className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Novo evento
            </button>
          )}
        </header>

        {/* Calendar body */}
        <div className="flex-1 overflow-hidden">
          {(view === "day" || view === "week") && (
            <TimeGrid
              view={view}
              days={gridDays}
              events={events}
              onSlotClick={handleSlotClick}
              onEventClick={setDetailEvent}
            />
          )}
          {view === "month" && (
            <MonthView
              selectedDate={selectedDate}
              events={events}
              onSelectDate={(d) => navigate({ date: d, view: "day" })}
              onEventClick={setDetailEvent}
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateEventDialog
        open={createDialog.open}
        onClose={() => setCreateDialog((s) => ({ ...s, open: false }))}
        companySlug={companySlug}
        professionals={professionals}
        defaultDate={createDialog.date}
        defaultStartTime={createDialog.time}
        defaultProfessionalId={createDialog.professionalId}
      />

      <EventDetailDialog
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        companySlug={companySlug}
        canDelete={isOwner || canManage}
      />
    </div>
  );
}
