"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import {
  createBookingConfigAction,
  updateBookingConfigAction,
} from "@/server/actions/booking-configs";

type Agenda = { id: string; name: string };

type ServiceType = {
  id: string;
  name: string;
  estimatedMinutes: number;
  price: number;
};

type Service = {
  id: string;
  name: string;
  serviceTypes: ServiceType[];
};

type ExtraService = { id: string; name: string };

type ExistingConfig = {
  id: string;
  name: string;
  agendaId: string;
  allowPartialService: boolean;
  serviceTypes: { serviceType: { id: string } }[];
  extraServices: { extraService: { id: string } }[];
};

type Props = {
  companySlug: string;
  agendas: Agenda[];
  services: Service[];
  extraServices: ExtraService[];
  existing?: ExistingConfig;
};

function FieldError({
  errors,
  field,
}: {
  errors: Record<string, string[]> | null;
  field: string;
}) {
  const msgs = errors?.[field];
  if (!msgs?.length) return null;
  return (
    <p className="text-xs text-[var(--color-danger)] mt-1" role="alert">
      {msgs[0]}
    </p>
  );
}

function formatMinutes(m: number) {
  return m < 60 ? `${m}min` : `${m / 60}h`;
}

export function BookingConfigFormClient({
  companySlug,
  agendas,
  services,
  extraServices,
  existing,
}: Props) {
  const router = useRouter();
  const company = useCompany();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);

  const [selectedServiceTypeIds, setSelectedServiceTypeIds] = useState<
    string[]
  >(existing?.serviceTypes.map((s) => s.serviceType.id) ?? []);

  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>(
    existing?.extraServices.map((e) => e.extraService.id) ?? []
  );

  function toggleServiceType(id: string) {
    setSelectedServiceTypeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleExtra(id: string) {
    setSelectedExtraIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    fd.set("intent", submitter?.value ?? "draft");
    fd.set("companySlug", companySlug);
    if (existing) fd.set("id", existing.id);

    // Clear and re-add array fields from state
    fd.delete("serviceTypeIds");
    fd.delete("extraServiceIds");
    selectedServiceTypeIds.forEach((id) => fd.append("serviceTypeIds", id));
    selectedExtraIds.forEach((id) => fd.append("extraServiceIds", id));

    const action = existing
      ? updateBookingConfigAction
      : createBookingConfigAction;

    startTransition(async () => {
      const result = await action(fd);
      if (result.success) {
        router.push(`/${companySlug}/booking`);
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
          onClick={() => router.push(`/${companySlug}/booking`)}
          className="text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
          aria-label="Voltar para booking"
        >
          ← Booking
        </button>
        <h1 className="text-2xl font-bold text-[var(--color-text-heading)]">
          {existing ? "Editar configuração" : "Nova configuração"}
        </h1>
      </div>

      {errors?.["_"] && (
        <div
          className="mb-5 bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] rounded-[var(--radius-control)] px-4 py-3"
          role="alert"
        >
          <p className="text-sm text-[var(--color-danger)]">{errors["_"][0]}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-[var(--color-text)] mb-1"
          >
            Nome da configuração <span aria-hidden="true">*</span>
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

        {/* Agenda */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <label
            htmlFor="agendaId"
            className="block text-sm font-medium text-[var(--color-text)] mb-1"
          >
            Agenda <span aria-hidden="true">*</span>
          </label>
          {agendas.length === 0 ? (
            <p className="text-sm text-[var(--color-warning)]">
              Nenhuma agenda ativa. Publique uma agenda primeiro.
            </p>
          ) : (
            <select
              id="agendaId"
              name="agendaId"
              required
              defaultValue={existing?.agendaId ?? ""}
              className="w-full border border-[var(--color-border-strong)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] bg-[var(--color-bg)]"
            >
              <option value="">Selecione uma agenda</option>
              {agendas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <FieldError errors={errors} field="agendaId" />
        </div>

        {/* Service types */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <fieldset>
            <legend
              id="services-legend"
              className="text-sm font-medium text-[var(--color-text)] mb-3"
            >
              Tipos de serviço disponíveis <span aria-hidden="true">*</span>
            </legend>

            {services.length === 0 ? (
              <p className="text-sm text-[var(--color-warning)]">
                Nenhum serviço cadastrado. Adicione serviços primeiro.
              </p>
            ) : (
              <div
                className="space-y-4"
                role="group"
                aria-labelledby="services-legend"
              >
                {services.map((service) => (
                  <div key={service.id}>
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                      {service.name}
                    </p>
                    <div className="space-y-1.5 pl-2">
                      {service.serviceTypes.map((st) => {
                        const checked = selectedServiceTypeIds.includes(st.id);
                        return (
                          <label
                            key={st.id}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleServiceType(st.id)}
                              className="w-4 h-4 rounded border-[var(--color-border-strong)] text-[var(--color-info)] focus:ring-[var(--color-info)]"
                            />
                            <span className="text-sm text-[var(--color-text)] flex-1">
                              {st.name}
                            </span>
                            <span className="text-xs text-[var(--color-text-subtle)]">
                              {formatMinutes(st.estimatedMinutes)} · {formatMoney(st.price, company.currency, company.locale)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <FieldError errors={errors} field="serviceTypeIds" />
          </fieldset>
        </div>

        {/* Extra services */}
        {extraServices.length > 0 && (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
            <fieldset>
              <legend
                id="extras-legend"
                className="text-sm font-medium text-[var(--color-text)] mb-3"
              >
                Serviços adicionais (opcionais ao cliente)
              </legend>
              <div
                className="space-y-1.5"
                role="group"
                aria-labelledby="extras-legend"
              >
                {extraServices.map((extra) => {
                  const checked = selectedExtraIds.includes(extra.id);
                  return (
                    <label
                      key={extra.id}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExtra(extra.id)}
                        className="w-4 h-4 rounded border-[var(--color-border-strong)] text-[var(--color-info)] focus:ring-[var(--color-info)]"
                      />
                      <span className="text-sm text-[var(--color-text)]">{extra.name}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* Allow partial service */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="allowPartialService"
              value="true"
              defaultChecked={existing?.allowPartialService ?? false}
              className="w-4 h-4 rounded border-[var(--color-border-strong)] text-[var(--color-info)] focus:ring-[var(--color-info)] mt-0.5"
            />
            <div>
              <span className="text-sm font-medium text-[var(--color-text)]">
                Permitir serviço parcial
              </span>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                O cliente pode agendar sem selecionar todos os tipos de serviço
              </p>
            </div>
          </label>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/${companySlug}/booking`)}
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
            disabled={isPending || agendas.length === 0}
            className="px-4 py-2 text-sm font-medium bg-[var(--color-info)] text-white rounded-[var(--radius-control)] hover:bg-[var(--color-info)] disabled:opacity-60"
          >
            {isPending ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </form>
    </div>
  );
}
