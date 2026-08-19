"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createAgendaAction, updateAgendaAction } from "@/server/actions/agendas";

const DAY_OPTIONS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

type Professional = { id: string; name: string };

type ExistingAgenda = {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  workingDays: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  professionals: { professional: { id: string } }[];
};

type Props = {
  companySlug: string;
  professionals: Professional[];
  existing?: ExistingAgenda;
};

function FieldError({ errors, field }: { errors: Record<string, string[]> | null; field: string }) {
  const msgs = errors?.[field];
  if (!msgs?.length) return null;
  return <p className="text-xs text-[var(--color-danger)] mt-1" role="alert">{msgs[0]}</p>;
}

export function AgendaFormClient({ companySlug, professionals, existing }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);

  const [selectedDays, setSelectedDays] = useState<number[]>(
    existing?.workingDays ?? [1, 2, 3, 4, 5]
  );
  const [selectedProfs, setSelectedProfs] = useState<string[]>(
    existing?.professionals.map((p) => p.professional.id) ?? []
  );

  function toggleDay(val: number) {
    setSelectedDays((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );
  }

  function toggleProf(id: string) {
    setSelectedProfs((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // intent comes from the submitter button's value
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    fd.set("intent", submitter?.value ?? "draft");
    fd.set("companySlug", companySlug);
    if (existing) fd.set("id", existing.id);

    const action = existing ? updateAgendaAction : createAgendaAction;
    startTransition(async () => {
      const result = await action(fd);
      if (result.success) {
        router.push(`/${companySlug}/agendas`);
        router.refresh();
      } else {
        setErrors(result.errors);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/${companySlug}/agendas`)}
          className="text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
          aria-label="Voltar para agendas"
        >
          ← Agendas
        </button>
        <h1 className="text-2xl font-bold text-[var(--color-text-heading)]">
          {existing ? "Editar Agenda" : "Nova Agenda"}
        </h1>
      </div>

      {errors?.["_"] && (
        <div className="mb-5 bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] rounded-[var(--radius-control)] px-4 py-3" role="alert">
          <p className="text-sm text-[var(--color-danger)]">{errors["_"][0]}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hidden inputs for array state */}
        {selectedDays.map((d) => (
          <input key={`day-${d}`} type="hidden" name="workingDays" value={d} />
        ))}
        {selectedProfs.map((id) => (
          <input key={`prof-${id}`} type="hidden" name="professionalIds" value={id} />
        ))}

        {/* Name */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            Nome da agenda <span aria-hidden="true">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoFocus
            defaultValue={existing?.name ?? ""}
            className="w-full border border-[var(--color-border-strong)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
          />
          <FieldError errors={errors} field="name" />
        </div>

        {/* Dates */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <p className="text-sm font-medium text-[var(--color-text)] mb-3">Período</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-xs text-[var(--color-text-muted)] mb-1">
                Início <span aria-hidden="true">*</span>
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                defaultValue={existing?.startDate ?? ""}
                className="w-full border border-[var(--color-border-strong)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
              />
              <FieldError errors={errors} field="startDate" />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-xs text-[var(--color-text-muted)] mb-1">
                Término (opcional)
              </label>
              <input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={existing?.endDate ?? ""}
                className="w-full border border-[var(--color-border-strong)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
              />
              <FieldError errors={errors} field="endDate" />
            </div>
          </div>
        </div>

        {/* Working days */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <fieldset>
            <legend id="days-legend" className="text-sm font-medium text-[var(--color-text)] mb-3">
              Dias de trabalho <span aria-hidden="true">*</span>
            </legend>
            <div className="flex gap-2 flex-wrap" role="group" aria-labelledby="days-legend">
              {DAY_OPTIONS.map(({ value, label }) => {
                const checked = selectedDays.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    aria-pressed={checked}
                    aria-label={label}
                    className={`w-12 h-12 rounded-[var(--radius-control)] text-sm font-medium border-2 transition-colors ${
                      checked
                        ? "bg-[var(--color-info)] text-white border-[var(--color-info-border)]"
                        : "bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-info-border)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <FieldError errors={errors} field="workingDays" />
          </fieldset>
        </div>

        {/* Times */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <p className="text-sm font-medium text-[var(--color-text)] mb-3">Horário de funcionamento</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-xs text-[var(--color-text-muted)] mb-1">
                Início <span aria-hidden="true">*</span>
              </label>
              <input
                id="startTime"
                name="startTime"
                type="time"
                required
                defaultValue={existing?.startTime ?? "09:00"}
                className="w-full border border-[var(--color-border-strong)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
              />
              <FieldError errors={errors} field="startTime" />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-xs text-[var(--color-text-muted)] mb-1">
                Término <span aria-hidden="true">*</span>
              </label>
              <input
                id="endTime"
                name="endTime"
                type="time"
                required
                defaultValue={existing?.endTime ?? "18:00"}
                className="w-full border border-[var(--color-border-strong)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
              />
              <FieldError errors={errors} field="endTime" />
            </div>
            <div>
              <label htmlFor="intervalMinutes" className="block text-xs text-[var(--color-text-muted)] mb-1">
                Intervalo <span aria-hidden="true">*</span>
              </label>
              <select
                id="intervalMinutes"
                name="intervalMinutes"
                required
                defaultValue={existing?.intervalMinutes ?? 60}
                className="w-full border border-[var(--color-border-strong)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] bg-[var(--color-bg)]"
              >
                <option value={30}>30 min</option>
                <option value={60}>1 hora</option>
              </select>
            </div>
          </div>
        </div>

        {/* Professionals */}
        {professionals.length > 0 && (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
            <fieldset>
              <legend id="profs-legend" className="text-sm font-medium text-[var(--color-text)] mb-3">
                Profissionais nesta agenda
              </legend>
              <div className="space-y-2" role="group" aria-labelledby="profs-legend">
                {professionals.map((pro) => {
                  const checked = selectedProfs.includes(pro.id);
                  return (
                    <label key={pro.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProf(pro.id)}
                        className="w-4 h-4 rounded border-[var(--color-border-strong)] text-[var(--color-info)] focus:ring-[var(--color-info)]"
                      />
                      <span className="text-sm text-[var(--color-text)]">{pro.name}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* Submit buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/${companySlug}/agendas`)}
            className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            name="intent"
            value="draft"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium border border-[var(--color-border-strong)] rounded-[var(--radius-control)] text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-60"
          >
            Salvar rascunho
          </button>
          <button
            type="submit"
            name="intent"
            value="publish"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium bg-[var(--color-info)] text-white rounded-[var(--radius-control)] hover:bg-[var(--color-info)] disabled:opacity-60"
          >
            {isPending ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </form>
    </div>
  );
}
