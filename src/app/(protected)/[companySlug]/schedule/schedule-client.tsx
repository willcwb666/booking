"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CalendarView } from "@/lib/calendar";
import {
  MONTH_NAMES,
  EVENT_TYPE_CONFIG,
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
  bookingId?: string | null;
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
    /*
      `h-screen` aqui estourava a viewport: esta tela vive dentro do shell, que
      já gasta 3,5rem com o cabeçalho — e mais, quando há banner de cobrança.
      O resultado era rolagem dupla, com o fim da agenda sempre abaixo da
      dobra. `flex-1 min-h-0` ocupa o que sobrou, seja quanto for.
    */
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Painel lateral (some no mobile: 224px fixos comiam metade da tela) ── */}
      <aside
        className="hidden lg:flex w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg)] flex-col overflow-y-auto py-4 gap-5"
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
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            Profissional
          </p>
          <ul className="space-y-0.5" role="list">
            <li>
              <button
                type="button"
                onClick={() => navigate({ professional: "all" })}
                aria-pressed={selectedProfessional === "all"}
                className={`w-full text-left px-3 py-1.5 rounded-[var(--radius-control)] text-sm transition-colors ${
                  selectedProfessional === "all"
                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
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
                  className={`w-full text-left px-3 py-1.5 rounded-[var(--radius-control)] text-sm transition-colors truncate ${
                    selectedProfessional === p.id
                      ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
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
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
            Legenda
          </p>
          {/* Lê de EVENT_TYPE_CONFIG, a mesma fonte que pinta os eventos no
              grid. Antes as bolinhas usavam cores escritas aqui à mão e não
              batiam com as dos eventos — que é a única coisa que uma legenda
              precisa fazer. */}
          <ul className="space-y-1.5" role="list">
            {Object.values(EVENT_TYPE_CONFIG).map((cfg) => (
              <li key={cfg.label} className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`}
                  aria-hidden="true"
                />
                <span className="text-xs text-[var(--color-text-muted)]">
                  {cfg.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] shrink-0 flex-wrap">
          {/* Today */}
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-[var(--radius-control)] hover:bg-[var(--color-bg-subtle)] font-medium text-[var(--color-text-heading)]"
          >
            Hoje
          </button>

          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Período anterior"
              className="p-1.5 rounded-[var(--radius-control)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Próximo período"
              className="p-1.5 rounded-[var(--radius-control)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          {/* Period label */}
          <h1
            className="text-base font-semibold text-[var(--color-text-heading)] flex-1 min-w-0 truncate capitalize"
            aria-live="polite"
            aria-atomic="true"
          >
            {periodLabel}
          </h1>

          {/* No mobile o painel lateral some, então o seletor de profissional
              precisa estar aqui — senão o filtro fica inalcançável no celular. */}
          <label className="lg:hidden">
            <span className="sr-only">Profissional</span>
            <select
              value={selectedProfessional}
              onChange={(e) => navigate({ professional: e.target.value })}
              className="input"
              style={{ paddingBlock: "0.35rem", fontSize: "var(--text-xs)", width: "auto" }}
            >
              <option value="all">Todos</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div className="segmented" role="tablist" aria-label="Tipo de visualização">
            {(["day", "week", "month"] as CalendarView[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                data-active={view === v}
                onClick={() => navigate({ view: v })}
                className="segmented-item"
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
              className="btn btn-primary text-sm py-1.5 px-3"
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
