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
      className="rounded-2xl shadow-xl border border-[var(--color-border)] p-0 w-full max-w-md backdrop:bg-black/30 backdrop:backdrop-blur-sm open:flex open:flex-col"
    >
      <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 id="create-event-title" className="text-base font-semibold text-[var(--color-text-heading)]">
          Novo evento
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="text-[var(--color-text-subtle)] hover:text-[var(--color-text-heading)] rounded p-1 hover:bg-[var(--color-bg-muted)]"
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
    </dialog>
  );
}
