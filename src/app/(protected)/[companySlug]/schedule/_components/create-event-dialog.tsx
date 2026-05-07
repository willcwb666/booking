"use client";

import { useEffect, useRef, useTransition, useState } from "react";
import { createScheduleEventAction } from "@/server/actions/schedule";

type Professional = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  companySlug: string;
  professionals: Professional[];
  defaultDate?: string;
  defaultStartTime?: string;
  defaultProfessionalId?: string;
};

const EVENT_TYPES = [
  { value: "APPOINTMENT", label: "Agendamento" },
  { value: "EVENT", label: "Evento" },
  { value: "ESTIMATE", label: "Estimate" },
] as const;

export function CreateEventDialog({
  open,
  onClose,
  companySlug,
  professionals,
  defaultDate = "",
  defaultStartTime = "09:00",
  defaultProfessionalId = "",
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
      setErrors(null);
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  // Close on backdrop click
  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
      onClose();
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("companySlug", companySlug);

    startTransition(async () => {
      const result = await createScheduleEventAction(fd);
      if (result.success) {
        onClose();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={handleDialogClick}
      aria-labelledby="create-event-title"
      aria-modal="true"
      className="rounded-2xl shadow-xl border border-gray-200 p-0 w-full max-w-md backdrop:bg-black/30 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <h2 id="create-event-title" className="text-base font-semibold text-gray-900">
          Novo evento
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="text-gray-400 hover:text-gray-700 rounded p-1 hover:bg-gray-100"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {errors?.["_"] && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
            <p className="text-sm text-red-700">{errors["_"][0]}</p>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="ev-title" className="block text-sm font-medium text-gray-700 mb-1">
            Título <span aria-hidden="true">*</span>
          </label>
          <input
            id="ev-title"
            name="title"
            type="text"
            required
            autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors?.title && <p className="text-xs text-red-600 mt-1" role="alert">{errors.title[0]}</p>}
        </div>

        {/* Type */}
        <div>
          <label htmlFor="ev-type" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo <span aria-hidden="true">*</span>
          </label>
          <select
            id="ev-type"
            name="type"
            defaultValue="EVENT"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {EVENT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Date + Times */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1">
            <label htmlFor="ev-date" className="block text-sm font-medium text-gray-700 mb-1">
              Data <span aria-hidden="true">*</span>
            </label>
            <input
              id="ev-date"
              name="date"
              type="date"
              required
              defaultValue={defaultDate}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="ev-start" className="block text-sm font-medium text-gray-700 mb-1">
              Início <span aria-hidden="true">*</span>
            </label>
            <input
              id="ev-start"
              name="startTime"
              type="time"
              required
              defaultValue={defaultStartTime}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="ev-end" className="block text-sm font-medium text-gray-700 mb-1">
              Término <span aria-hidden="true">*</span>
            </label>
            <input
              id="ev-end"
              name="endTime"
              type="time"
              required
              defaultValue="10:00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors?.endTime && <p className="text-xs text-red-600 mt-1" role="alert">{errors.endTime[0]}</p>}
          </div>
        </div>

        {/* Professional */}
        {professionals.length > 0 && (
          <div>
            <label htmlFor="ev-prof" className="block text-sm font-medium text-gray-700 mb-1">
              Profissional
            </label>
            <select
              id="ev-prof"
              name="professionalId"
              defaultValue={defaultProfessionalId}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Nenhum</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="ev-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Observações
          </label>
          <textarea
            id="ev-notes"
            name="notes"
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
