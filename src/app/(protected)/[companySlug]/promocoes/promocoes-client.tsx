"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import {
  createPromotionAction,
  updatePromotionAction,
  deletePromotionAction,
  sendPromotionEmailAction,
} from "@/server/actions/promotions";

type Promotion = {
  id: string;
  description: string;
  promoPrice: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  lastSentAt: string | null;
  serviceTypeId: string;
  serviceName: string;
  servicePrice: number;
};

type ServiceTypeOption = {
  id: string;
  label: string;
  price: number;
};

type Props = {
  companySlug: string;
  promotions: Promotion[];
  serviceTypes: ServiceTypeOption[];
  optInCount: number;
};

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; item: Promotion }
  | { type: "compose" };

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function promoStatus(p: Promotion): { label: string; className: string } {
  const today = todayStr();
  if (!p.isActive) return { label: "Inativa", className: "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]" };
  if (today < p.startDate) return { label: "Agendada", className: "bg-[var(--color-warning-light)] text-[var(--color-warning)]" };
  if (today > p.endDate) return { label: "Expirada", className: "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]" };
  return { label: "Ativa", className: "bg-[var(--color-success-light)] text-[var(--color-success)]" };
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function FieldError({ errors, field }: { errors: Record<string, string[]> | null; field: string }) {
  const msgs = errors?.[field];
  if (!msgs?.length) return null;
  return (
    <p className="text-xs text-[var(--color-danger)] mt-1" role="alert">{msgs[0]}</p>
  );
}

export function PromocoesClient({ companySlug, promotions, serviceTypes, optInCount }: Props) {
  const router = useRouter();
  const company = useCompany();
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDialog(state: DialogState) {
    setDialog(state);
    setFieldErrors(null);
    requestAnimationFrame(() => dialogRef.current?.showModal());
  }

  function closeDialog() {
    dialogRef.current?.close();
    setDialog({ type: "none" });
    setFieldErrors(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("companySlug", companySlug);
    if (dialog.type === "edit") fd.set("id", dialog.item.id);

    startTransition(async () => {
      if (dialog.type === "compose") {
        const result = await sendPromotionEmailAction(fd);
        if (result.success) {
          closeDialog();
          setFeedback({ kind: "ok", text: `E-mail enviado para ${result.sent} cliente(s)!` });
          router.refresh();
        } else {
          setFieldErrors(result.errors);
        }
        return;
      }

      const action = dialog.type === "edit" ? updatePromotionAction : createPromotionAction;
      const result = await action(fd);
      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setFieldErrors(result.errors);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Excluir esta promoção?")) return;
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", id);
    startTransition(async () => {
      await deletePromotionAction(fd);
      router.refresh();
    });
  }

  const today = todayStr();
  const activePromos = promotions.filter(
    (p) => p.isActive && p.startDate <= today && p.endDate >= today
  );

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-[var(--color-text-heading)]">Promoções</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openDialog({ type: "compose" })}
            disabled={activePromos.length === 0 || optInCount === 0}
            title={
              activePromos.length === 0
                ? "Nenhuma promoção vigente para enviar"
                : optInCount === 0
                ? "Nenhum cliente com opt-in de ofertas"
                : undefined
            }
            className="px-4 py-2 text-sm font-semibold bg-[var(--color-success)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            ✉ Criar e-mail
          </button>
          <button
            type="button"
            onClick={() => openDialog({ type: "create" })}
            className="px-4 py-2 text-sm font-semibold bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
          >
            Nova promoção
          </button>
        </div>
      </div>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Descontos por período em serviços específicos. O preço promocional é aplicado
        automaticamente nos orçamentos dentro do período.
      </p>

      {feedback && (
        <div
          role={feedback.kind === "err" ? "alert" : "status"}
          className={`mb-4 p-3 rounded-lg text-sm border ${
            feedback.kind === "ok"
              ? "bg-[var(--color-success-light)] border-[var(--color-success-border)] text-[var(--color-success)]"
              : "bg-[var(--color-danger-light)] border-[var(--color-danger-border)] text-[var(--color-danger)]"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {promotions.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-10 text-center">
          <p className="text-[var(--color-text-muted)] text-sm">
            Nenhuma promoção cadastrada. Crie a primeira para oferecer descontos aos seus clientes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((p) => {
            const status = promoStatus(p);
            return (
              <div key={p.id} className="bg-white rounded-xl border border-[var(--color-border)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--color-text-heading)]">{p.serviceName}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text)] mt-1">{p.description}</p>
                    <p className="text-sm mt-2">
                      <s className="text-[var(--color-text-subtle)]">{formatMoney(p.servicePrice, company.currency, company.locale)}</s>{" "}
                      <span className="font-bold text-[var(--color-success)]">
                        {formatMoney(p.promoPrice, company.currency, company.locale)}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] ml-2">
                        {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                      </span>
                    </p>
                    {p.lastSentAt && (
                      <p className="text-xs text-[var(--color-text-subtle)] mt-1">
                        Último envio: {new Date(p.lastSentAt).toLocaleString(company.locale)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openDialog({ type: "edit", item: p })}
                      className="px-3 py-1.5 text-xs font-medium text-[var(--color-text)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-subtle)]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="px-3 py-1.5 text-xs font-medium text-[var(--color-danger)] border border-[var(--color-danger-border)] rounded-lg hover:bg-[var(--color-danger-light)]"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-[var(--color-text-subtle)] mt-6">
        {optInCount} cliente(s) aceitaram receber e-mails de ofertas.
      </p>

      {/* Dialog */}
      <dialog
        ref={dialogRef}
        onClose={() => setDialog({ type: "none" })}
        className="rounded-2xl p-0 backdrop:bg-black/40 w-full max-w-md m-auto"
      >
        {dialog.type !== "none" && (
          <form onSubmit={handleSubmit}>
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-base font-semibold text-[var(--color-text-heading)]">
                {dialog.type === "compose"
                  ? "Criar e-mail de promoções"
                  : dialog.type === "edit"
                  ? "Editar promoção"
                  : "Nova promoção"}
              </h2>
            </div>

            <div className="p-5 space-y-4">
              {fieldErrors?._ && (
                <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] rounded-lg px-3 py-2" role="alert">
                  {fieldErrors._[0]}
                </p>
              )}

              {dialog.type === "compose" && (
                <>
                  <div>
                    <label htmlFor="email-title" className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">
                      Título <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="email-title"
                      name="title"
                      type="text"
                      required
                      maxLength={120}
                      autoFocus
                      placeholder="Ex.: Ofertas de inverno ❄️"
                      className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                    <FieldError errors={fieldErrors} field="title" />
                  </div>

                  <div>
                    <label htmlFor="email-description" className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">
                      Descrição <span aria-hidden="true">*</span>
                    </label>
                    <textarea
                      id="email-description"
                      name="description"
                      rows={4}
                      required
                      maxLength={1000}
                      placeholder="Texto que aparece no corpo do e-mail, antes da lista de serviços."
                      className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                    />
                    <FieldError errors={fieldErrors} field="description" />
                  </div>

                  <div className="rounded-lg bg-[var(--color-bg-subtle)] border border-[var(--color-border)] p-3 text-xs text-[var(--color-text)] space-y-1">
                    <p className="font-semibold text-[var(--color-text-heading)]">O e-mail incluirá automaticamente:</p>
                    <p>• Logo e nome da empresa no cabeçalho</p>
                    {activePromos.map((p) => (
                      <p key={p.id}>
                        • {p.serviceName} —{" "}
                        <s>{formatMoney(p.servicePrice, company.currency, company.locale)}</s>{" "}
                        <span className="text-[var(--color-success)] font-semibold">
                          {formatMoney(p.promoPrice, company.currency, company.locale)}
                        </span>{" "}
                        (até {fmtDate(p.endDate)})
                      </p>
                    ))}
                    <p className="pt-1 text-[var(--color-text-muted)]">
                      Destinatários: <strong>{optInCount}</strong> cliente(s) com opt-in de ofertas.
                    </p>
                  </div>
                </>
              )}

              {(dialog.type === "create" || dialog.type === "edit") && (
              <>
              <div>
                <label htmlFor="serviceTypeId" className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">
                  Serviço <span aria-hidden="true">*</span>
                </label>
                <select
                  id="serviceTypeId"
                  name="serviceTypeId"
                  required
                  defaultValue={dialog.type === "edit" ? dialog.item.serviceTypeId : ""}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
                >
                  <option value="" disabled>Selecione o serviço</option>
                  {serviceTypes.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label} ({formatMoney(st.price, company.currency, company.locale)})
                    </option>
                  ))}
                </select>
                <FieldError errors={fieldErrors} field="serviceTypeId" />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">
                  Descrição <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  required
                  maxLength={300}
                  placeholder="Ex.: Promoção de inverno — 20% off"
                  defaultValue={dialog.type === "edit" ? dialog.item.description : ""}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                />
                <FieldError errors={fieldErrors} field="description" />
              </div>

              <div>
                <label htmlFor="promoPrice" className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">
                  Valor promocional ({company.currency}) <span aria-hidden="true">*</span>
                </label>
                <input
                  id="promoPrice"
                  name="promoPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={dialog.type === "edit" ? dialog.item.promoPrice : ""}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <FieldError errors={fieldErrors} field="promoPrice" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">
                    Data inicial <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                    defaultValue={dialog.type === "edit" ? dialog.item.startDate : ""}
                    className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <FieldError errors={fieldErrors} field="startDate" />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-[var(--color-text-heading)] mb-1">
                    Data final <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    required
                    defaultValue={dialog.type === "edit" ? dialog.item.endDate : ""}
                    className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <FieldError errors={fieldErrors} field="endDate" />
                </div>
              </div>
              </>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDialog}
                className="px-4 py-2 text-sm text-[var(--color-text)] hover:text-[var(--color-text-heading)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-colors ${
                  dialog.type === "compose"
                    ? "bg-[var(--color-success)] hover:opacity-90"
                    : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
                }`}
              >
                {isPending
                  ? "Enviando..."
                  : dialog.type === "compose"
                  ? `Enviar para ${optInCount} cliente(s)`
                  : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
