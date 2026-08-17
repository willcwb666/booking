"use client";

import { useTransition, useState } from "react";
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
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);

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

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <h2 id="create-event-title" className="text-base font-bold text-stone-900">
            Novo evento
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {errors?.["_"] && (
          <div className="bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] rounded-lg px-3 py-2" role="alert">
            <p className="text-sm text-[var(--color-danger)]">{errors["_"][0]}</p>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="ev-title" className="input-label">
            Título <span aria-hidden="true">*</span>
          </label>
          <input
            id="ev-title"
            name="title"
            type="text"
            required
            autoFocus
            className="input"
          />
          {errors?.title && <p className="text-xs text-[var(--color-danger)] mt-1" role="alert">{errors.title[0]}</p>}
        </div>

        {/* Type */}
        <div>
          <label htmlFor="ev-type" className="input-label">
            Tipo <span aria-hidden="true">*</span>
          </label>
          <select
            id="ev-type"
            name="type"
            defaultValue="EVENT"
            className="select"
          >
            {EVENT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Date + Times */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1">
            <label htmlFor="ev-date" className="input-label">
              Data <span aria-hidden="true">*</span>
            </label>
            <input
              id="ev-date"
              name="date"
              type="date"
              required
              defaultValue={defaultDate}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="ev-start" className="input-label">
              Início <span aria-hidden="true">*</span>
            </label>
            <input
              id="ev-start"
              name="startTime"
              type="time"
              required
              defaultValue={defaultStartTime}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="ev-end" className="input-label">
              Término <span aria-hidden="true">*</span>
            </label>
            <input
              id="ev-end"
              name="endTime"
              type="time"
              required
              defaultValue="10:00"
              className="input"
            />
            {errors?.endTime && <p className="text-xs text-[var(--color-danger)] mt-1" role="alert">{errors.endTime[0]}</p>}
          </div>
        </div>

        {/* Professional */}
        {professionals.length > 0 && (
          <div>
            <label htmlFor="ev-prof" className="input-label">
              Profissional
            </label>
            <select
              id="ev-prof"
              name="professionalId"
              defaultValue={defaultProfessionalId}
              className="select"
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
          <label htmlFor="ev-notes" className="input-label">
            Observações
          </label>
          <textarea
            id="ev-notes"
            name="notes"
            rows={2}
            className="textarea resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="btn btn-primary"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
}
