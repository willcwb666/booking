"use client";

import { useEffect, useRef, useTransition } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (event) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [event]);

  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (
      rect &&
      (e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom)
    ) {
      onClose();
    }
  }

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

  const typeCfg = event ? EVENT_TYPE_CONFIG[event.type] : null;

  function formatDate(d: string) {
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={handleDialogClick}
      aria-labelledby="event-detail-title"
      aria-modal="true"
      className="rounded-2xl shadow-xl border border-gray-200 p-0 w-full max-w-sm backdrop:bg-black/30 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      {event && typeCfg && (
        <>
          <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${typeCfg.bg} ${typeCfg.text}`}
              >
                {typeCfg.label}
              </span>
              <h2
                id="event-detail-title"
                className="text-base font-semibold text-gray-900"
              >
                {event.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="text-gray-400 hover:text-gray-700 rounded p-1 hover:bg-gray-100 shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-5 space-y-3">
            <div>
              <p className="text-xs text-gray-500">Data</p>
              <p className="text-sm text-gray-800">{formatDate(event.date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Horário</p>
              <p className="text-sm text-gray-800">
                {event.startTime} – {event.endTime}
              </p>
            </div>
            {event.professional && (
              <div>
                <p className="text-xs text-gray-500">Profissional</p>
                <p className="text-sm text-gray-800">
                  {event.professional.name}
                </p>
              </div>
            )}
            {event.notes && (
              <div>
                <p className="text-xs text-gray-500">Observações</p>
                <p className="text-sm text-gray-800 whitespace-pre-line">
                  {event.notes}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Criado por</p>
              <p className="text-sm text-gray-800">{event.createdBy.name}</p>
            </div>
          </div>

          {canDelete && (
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60"
              >
                {isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
