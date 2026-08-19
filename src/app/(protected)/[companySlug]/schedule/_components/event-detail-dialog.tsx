"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteScheduleEventAction } from "@/server/actions/schedule";
import { EVENT_TYPE_CONFIG } from "@/lib/calendar";

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
  event: ScheduleEvent | null;
  onClose: () => void;
  companySlug: string;
  canDelete: boolean;
};

export function EventDetailDialog({
  event,
  onClose,
  companySlug,
  canDelete,
}: Props) {
  const [isPending, startTransition] = useTransition();

  if (!event) return null;

  const typeCfg = EVENT_TYPE_CONFIG[event.type] ?? EVENT_TYPE_CONFIG.APPOINTMENT;

  function handleDelete() {
    if (!event) return;
    if (!confirm(`Excluir "${event.title}"?`)) return;
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", event.id);
    startTransition(async () => {
      await deleteScheduleEventAction(fd);
      onClose();
    });
  }

  function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-card)] shadow-2xl border border-[var(--color-border)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-start justify-between gap-3 bg-[var(--color-bg-subtle)]">
          <div className="min-w-0">
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 ${typeCfg.bg} ${typeCfg.text}`}
            >
              {typeCfg.label}
            </span>
            <h2
              id="event-detail-title"
              className="text-base font-bold text-[var(--color-text-heading)] leading-tight"
            >
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-control)] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] transition-colors"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-3.5">
          <div className="flex items-center justify-between py-1 border-b border-[var(--color-border)]">
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Data</p>
            <p className="text-sm font-semibold text-[var(--color-text)] capitalize">
              {formatDate(event.date)}
            </p>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-[var(--color-border)]">
            <p className="text-xs font-medium text-[var(--color-text-muted)]">Horário</p>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {event.startTime} – {event.endTime}
            </p>
          </div>
          {event.professional && (
            <div className="flex items-center justify-between py-1 border-b border-[var(--color-border)]">
              <p className="text-xs font-medium text-[var(--color-text-muted)]">Profissional</p>
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {event.professional.name}
              </p>
            </div>
          )}
          {event.notes && (
            <div className="py-1">
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Observações</p>
              <p className="text-xs text-[var(--color-text)] bg-[var(--color-bg-subtle)] p-2.5 rounded-[var(--radius-control)] border border-[var(--color-border)] whitespace-pre-line leading-relaxed">
                {event.notes}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs font-medium text-[var(--color-text-subtle)]">Origem</p>
            <p className="text-xs text-[var(--color-text-muted)]">{event.createdBy.name}</p>
          </div>
        </div>

        <div className="px-6 py-4 bg-[var(--color-bg-subtle)] border-t border-[var(--color-border)] flex items-center justify-end gap-3">
          {event.bookingId ? (
            <Link
              href={`/${companySlug}/agendamentos/${event.bookingId}`}
              className="w-full text-center px-4 py-2.5 bg-[var(--color-navy)] hover:bg-[var(--color-navy)] text-white text-xs font-bold rounded-[var(--radius-control)] shadow-sm transition-all"
            >
              Ver Detalhes do Agendamento / Comanda →
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] rounded-[var(--radius-control)] transition-colors"
              >
                Fechar
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-[var(--radius-control)] transition-colors disabled:opacity-50"
                >
                  {isPending ? "Excluindo..." : "Excluir Evento"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
