"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useRef, useState } from "react";
import { publishAgendaAction, cancelAgendaAction } from "@/server/actions/agendas";
import type { AgendaStatus, CompanyUserRole } from "@/generated/prisma/client";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_CONFIG: Record<AgendaStatus, { label: string; classes: string; icon: string }> = {
  DRAFT:     { label: "Rascunho", classes: "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]",   icon: "✏" },
  ACTIVE:    { label: "Ativa",    classes: "bg-[var(--color-success-light)] text-[var(--color-success)]", icon: "✓" },
  CANCELLED: { label: "Cancelada",classes: "bg-[var(--color-danger-light)] text-[var(--color-danger)]",     icon: "✕" },
};

type Professional = { id: string; name: string };
type AgendaProf = { professional: { id: string; name: string } };
type Agenda = {
  id: string;
  name: string;
  status: AgendaStatus;
  startDate: string;
  endDate: string | null;
  workingDays: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  professionals: AgendaProf[];
};

type Props = {
  companySlug: string;
  agendas: Agenda[];
  professionals: Professional[];
  role: CompanyUserRole;
  activeStatuses: AgendaStatus[];
};

export function AgendasClient({ companySlug, agendas, professionals, role, activeStatuses }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const cancelDialogRef = useRef<HTMLDialogElement>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string } | null>(null);

  function handlePublish(id: string) {
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", id);
    startTransition(async () => {
      const result = await publishAgendaAction(fd);
      if (!result.success) alert(result.errors._?.[0] ?? "Erro ao publicar");
      else router.refresh();
    });
  }

  function openCancelDialog(agenda: { id: string; name: string }) {
    setCancelTarget(agenda);
    requestAnimationFrame(() => cancelDialogRef.current?.showModal());
  }

  function handleCancel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cancelTarget) return;
    const fd = new FormData(e.currentTarget);
    fd.set("companySlug", companySlug);
    fd.set("id", cancelTarget.id);
    startTransition(async () => {
      const result = await cancelAgendaAction(fd);
      cancelDialogRef.current?.close();
      if (!result.success) alert(result.errors._?.[0] ?? "Erro ao cancelar");
      else router.refresh();
    });
  }

  function toggleStatus(status: AgendaStatus) {
    const next = activeStatuses.includes(status)
      ? activeStatuses.filter((s) => s !== status)
      : [...activeStatuses, status];
    const params = new URLSearchParams();
    next.forEach((s) => params.append("status", s));
    router.push(`/${companySlug}/agendas?${params.toString()}`);
  }

  return (
    <div className="page-container">
     <div className="page-content">
      <div className="page-header !mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Agendas</h1>
          <p className="page-description">Gerencie as agendas de disponibilidade da empresa.</p>
        </div>
        {role !== "EMPLOYEE" && (
          <Link
            href={`/${companySlug}/agendas/nova`}
            className="btn btn-primary shrink-0"
          >
            + Nova Agenda
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3 items-center">
        <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Status:</span>
        <fieldset className="flex gap-2" aria-label="Filtrar por status">
          <legend className="sr-only">Filtrar por status</legend>
          {(["ACTIVE", "DRAFT", "CANCELLED"] as AgendaStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const checked = activeStatuses.includes(s);
            return (
              <label key={s} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer border transition-colors ${checked ? cfg.classes + " border-transparent" : "border-[var(--color-border)] text-[var(--color-text-subtle)] bg-white hover:border-[var(--color-border-strong)]"}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => toggleStatus(s)}
                  aria-label={`Mostrar agendas com status ${cfg.label}`}
                />
                <span aria-hidden="true">{cfg.icon}</span>
                {cfg.label}
              </label>
            );
          })}
        </fieldset>
      </div>

      {agendas.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm text-[var(--color-text-subtle)]">Nenhuma agenda encontrada.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <caption className="sr-only">Lista de agendas</caption>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Status</th>
                <th scope="col">Período</th>
                <th scope="col">Horário</th>
                <th scope="col">Dias</th>
                <th scope="col" className="!text-right sr-only">Ações</th>
              </tr>
            </thead>
            <tbody>
              {agendas.map((agenda) => {
                const cfg = STATUS_CONFIG[agenda.status];
                const canEdit = role !== "EMPLOYEE" && agenda.status !== "CANCELLED";
                const canPublish = role !== "EMPLOYEE" && agenda.status === "DRAFT";
                const canCancel = role === "OWNER" && agenda.status !== "CANCELLED";
                return (
                  <tr key={agenda.id}>
                    <td>
                      <p className="font-medium text-[var(--color-text-heading)]">{agenda.name}</p>
                      <p className="text-xs text-[var(--color-text-subtle)]">
                        {agenda.professionals.length > 0
                          ? agenda.professionals.map((p) => p.professional.name).join(", ")
                          : "Sem profissionais"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`} aria-label={`Status: ${cfg.label}`}>
                        <span aria-hidden="true">{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text)] text-xs">
                      <span>{agenda.startDate}</span>
                      {agenda.endDate && <span> → {agenda.endDate}</span>}
                      {!agenda.endDate && <span className="text-[var(--color-text-subtle)]"> (sem fim)</span>}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text)] text-xs">
                      {agenda.startTime}–{agenda.endTime}
                      <span className="text-[var(--color-text-subtle)] ml-1">/{agenda.intervalMinutes}min</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5 flex-wrap">
                        {DAY_LABELS.map((label, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-1.5 py-0.5 rounded ${agenda.workingDays.includes(idx) ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium" : "text-[var(--color-text-subtle)]"}`}
                            aria-label={agenda.workingDays.includes(idx) ? `${label}: ativo` : `${label}: inativo`}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" role="group" aria-label={`Ações para ${agenda.name}`}>
                        {canPublish && (
                          <button
                            onClick={() => handlePublish(agenda.id)}
                            disabled={isPending}
                            className="px-2 py-1 text-xs font-medium text-[var(--color-success)] hover:opacity-80 disabled:opacity-50"
                          >
                            Publicar
                          </button>
                        )}
                        {canEdit && (
                          <Link
                            href={`/${companySlug}/agendas/${agenda.id}/editar`}
                            className="px-2 py-1 text-xs text-[var(--color-text)] hover:text-[var(--color-text-heading)]"
                          >
                            Editar
                          </Link>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => openCancelDialog({ id: agenda.id, name: agenda.name })}
                            disabled={isPending}
                            className="px-2 py-1 text-xs text-[var(--color-danger)] hover:opacity-80 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancel dialog */}
      <dialog
        ref={cancelDialogRef}
        className="rounded-xl shadow-xl border border-[var(--color-border)] p-0 w-full max-w-sm backdrop:bg-black/40"
        aria-labelledby="cancel-dialog-title"
      >
        <form onSubmit={handleCancel}>
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 id="cancel-dialog-title" className="text-base font-semibold text-[var(--color-text-heading)]">
              Cancelar agenda
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Cancelando: <strong>{cancelTarget?.name}</strong>
            </p>
          </div>
          <div className="px-5 py-4">
            <label htmlFor="reason" className="input-label">
              Motivo (opcional)
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              className="textarea resize-none"
              autoFocus
            />
          </div>
          <div className="px-5 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => cancelDialogRef.current?.close()}
              className="btn btn-ghost"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-destructive"
            >
              {isPending ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
          </div>
        </form>
      </dialog>
     </div>
    </div>
  );
}
