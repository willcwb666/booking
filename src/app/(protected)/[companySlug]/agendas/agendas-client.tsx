"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { publishAgendaAction, cancelAgendaAction } from "@/server/actions/agendas";
import type { AgendaStatus, CompanyUserRole } from "@/generated/prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Modal } from "@/components/ui/modal";
import { FormField, TextareaInput } from "@/components/forms/form-elements";
import { Calendar, Plus, Edit2, CheckCircle2, XCircle } from "@/components/ui/icons";
import { toast } from "@/lib/toast-service";
import { Pagination } from "@/components/ui/pagination";

import { IconAction, RowActions } from "@/components/ui/icon-action";
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_VARIANTS: Record<AgendaStatus, { label: string; variant: "neutral" | "success" | "danger" }> = {
  DRAFT: { label: "Rascunho", variant: "neutral" },
  ACTIVE: { label: "Ativa", variant: "success" },
  CANCELLED: { label: "Cancelada", variant: "danger" },
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedAgendas = agendas.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Cancel Modal State
  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  function handlePublish(id: string, name: string) {
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", id);
    startTransition(async () => {
      const result = await publishAgendaAction(fd);
      if (!result.success) {
        toast.error("Erro ao publicar", result.errors._?.[0] ?? "Falha ao publicar a agenda.");
      } else {
        toast.success("Agenda Publicada!", `A agenda '${name}' agora está ativa.`);
        router.refresh();
      }
    });
  }

  function handleCancelSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cancelTarget) return;
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", cancelTarget.id);
    if (cancelReason.trim()) {
      fd.set("reason", cancelReason.trim());
    }

    startTransition(async () => {
      const result = await cancelAgendaAction(fd);
      if (!result.success) {
        toast.error("Erro ao cancelar", result.errors._?.[0] ?? "Falha ao cancelar a agenda.");
      } else {
        toast.success("Agenda Cancelada", `A agenda '${cancelTarget.name}' foi cancelada.`);
        setCancelTarget(null);
        setCancelReason("");
        router.refresh();
      }
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
    <div className="w-full max-w-7xl px-6 sm:px-10 py-8 text-left space-y-8 pb-32">
      <PageHeader
        category="Configuração de Horários"
        categoryIcon={<Calendar className="w-4 h-4" />}
        title="Agendas de Disponibilidade"
        description="Gerencie os quadros de horários, dias de funcionamento e atribuição de profissionais."
        action={
          role !== "EMPLOYEE" && (
            <Link
              href={`/${companySlug}/agendas/nova`}
              className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs rounded-[var(--radius-control)] shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 uppercase"
            >
              <Plus className="w-4 h-4" />
              <span>+ NOVA AGENDA</span>
            </Link>
          )
        }
      />

      {/* Filtros de Status */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--color-bg)] rounded-[var(--radius-card)] border border-[var(--color-border)] p-4 shadow-xs">
        <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Filtrar Status:
        </span>
        <div className="flex flex-wrap gap-2">
          {(["ACTIVE", "DRAFT", "CANCELLED"] as AgendaStatus[]).map((s) => {
            const cfg = STATUS_VARIANTS[s];
            const checked = activeStatuses.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                  checked
                    ? "bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary)] shadow-2xs"
                    : "bg-[var(--color-bg-subtle)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-strong)]"}`} />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela de Agendas */}
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 shadow-xs">
        {agendas.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="Nenhuma agenda encontrada"
            description="Não existem agendas cadastradas ou que correspondam ao filtro de status selecionado."
            action={
              role !== "EMPLOYEE" ? (
                <Link
                  href={`/${companySlug}/agendas/nova`}
                  className="px-4 py-2 bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold text-xs rounded-[var(--radius-control)] hover:bg-[var(--color-primary-light)] transition-colors inline-block"
                >
                  Criar Primeira Agenda
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-bold border-b border-[var(--color-border)]">
                  <th className="px-4 py-3">Nome da Agenda & Equipe</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Vigência</th>
                  <th className="px-4 py-3 text-center">Horários</th>
                  <th className="px-4 py-3 text-center">Dias de Trabalho</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] font-medium">
                {paginatedAgendas.map((agenda) => {
                  const cfg = STATUS_VARIANTS[agenda.status];
                  const canEdit = role !== "EMPLOYEE" && agenda.status !== "CANCELLED";
                  const canPublish = role !== "EMPLOYEE" && agenda.status === "DRAFT";
                  const canCancel = role === "OWNER" && agenda.status !== "CANCELLED";

                  return (
                    <tr key={agenda.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[var(--color-text-heading)] text-sm">{agenda.name}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                          {agenda.professionals.length > 0
                            ? agenda.professionals.map((p) => p.professional.name).join(", ")
                            : "Sem profissionais vinculados"}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge variant={cfg.variant}>{cfg.label}</StatusBadge>
                      </td>

                      <td className="px-4 py-3.5 text-center text-[var(--color-text-muted)] font-medium">
                        <span>{agenda.startDate}</span>
                        {agenda.endDate ? (
                          <span> → {agenda.endDate}</span>
                        ) : (
                          <span className="text-[var(--color-text-subtle)]"> (indeterminado)</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center font-mono text-[var(--color-text)] font-bold">
                        {agenda.startTime} - {agenda.endTime}
                        <span className="text-[var(--color-text-subtle)] font-normal ml-1">
                          ({agenda.intervalMinutes}m)
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {DAY_LABELS.map((label, idx) => {
                            const active = agenda.workingDays.includes(idx);
                            return (
                              <span
                                key={idx}
                                className={`text-[var(--text-2xs)] px-1.5 py-0.5 rounded-[var(--radius-sm)] font-bold ${
                                  active
                                    ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary)]"
                                    : "bg-[var(--color-bg-muted)] text-[var(--color-text-subtle)]"
                                }`}
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <RowActions>
                          {canPublish && (
                            <IconAction
                              intent="activate"
                              label={`Publicar agenda ${agenda.name}`}
                              onClick={() => handlePublish(agenda.id, agenda.name)}
                              pending={isPending}
                            />
                          )}
                          {canEdit && (
                            <IconAction
                              intent="edit"
                              label={`Editar agenda ${agenda.name}`}
                              href={`/${companySlug}/agendas/${agenda.id}/editar`}
                            />
                          )}
                          {canCancel && (
                            <IconAction
                              intent="block"
                              label={`Cancelar agenda ${agenda.name}`}
                              onClick={() =>
                                setCancelTarget({ id: agenda.id, name: agenda.name })
                              }
                              pending={isPending}
                            />
                          )}
                        </RowActions>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {agendas.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={agendas.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="agendas"
          />
        )}
      </div>

      {/* Modal de Cancelamento de Agenda */}
      {cancelTarget && (
        <Modal
          isOpen={Boolean(cancelTarget)}
          onClose={() => {
            setCancelTarget(null);
            setCancelReason("");
          }}
          title="Cancelar Agenda"
          description={`Você está cancelando a agenda '${cancelTarget.name}'. Os slots ficarão indisponíveis para novos agendamentos.`}
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <FormField label="Motivo do Cancelamento (opcional)">
              <TextareaInput
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo para o cancelamento desta agenda..."
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason("");
                }}
                disabled={isPending}
                className="px-4 py-2.5 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] text-xs font-bold rounded-[var(--radius-control)] transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2.5 bg-[var(--color-danger)] hover:bg-[var(--color-danger)] text-white text-xs font-bold rounded-[var(--radius-control)] transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
