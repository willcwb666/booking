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
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between gap-3 bg-stone-50/50">
          <div className="min-w-0">
            <span
              className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2 ${typeCfg.bg} ${typeCfg.text}`}
            >
              {typeCfg.label}
            </span>
            <h2
              id="event-detail-title"
              className="text-base font-bold text-stone-900 leading-tight"
            >
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-3.5">
          <div className="flex items-center justify-between py-1 border-b border-stone-100">
            <p className="text-xs font-medium text-stone-500">Data</p>
            <p className="text-sm font-semibold text-stone-800 capitalize">
              {formatDate(event.date)}
            </p>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-stone-100">
            <p className="text-xs font-medium text-stone-500">Horário</p>
            <p className="text-sm font-semibold text-stone-800">
              {event.startTime} – {event.endTime}
            </p>
          </div>
          {event.professional && (
            <div className="flex items-center justify-between py-1 border-b border-stone-100">
              <p className="text-xs font-medium text-stone-500">Profissional</p>
              <p className="text-sm font-semibold text-stone-800">
                {event.professional.name}
              </p>
            </div>
          )}
          {event.notes && (
            <div className="py-1">
              <p className="text-xs font-medium text-stone-500 mb-1">Observações</p>
              <p className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200/70 whitespace-pre-line leading-relaxed">
                {event.notes}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs font-medium text-stone-400">Origem</p>
            <p className="text-xs text-stone-500">{event.createdBy.name}</p>
          </div>
        </div>

        <div className="px-6 py-4 bg-stone-50/70 border-t border-stone-100 flex items-center justify-end gap-3">
          {event.bookingId ? (
            <Link
              href={`/${companySlug}/agendamentos/${event.bookingId}`}
              className="w-full text-center px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Ver Detalhes do Agendamento / Comanda →
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200/60 rounded-xl transition-colors"
              >
                Fechar
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
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
