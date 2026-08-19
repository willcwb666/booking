"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import { toggleDisableServiceAction } from "@/server/actions/services";
import { toast } from "@/lib/toast-service";
import { Scissors, Plus, Edit2, Ban, CheckCircle2 } from "@/components/ui/icons";
import { RenderServiceIcon } from "@/components/ui/service-icon-picker";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";

export type UnifiedServiceRow = {
  id: string;
  name: string;
  description: string | null;
  type: "PADRÃO" | "EXTRA";
  price: number;
  estimatedMinutes: number;
  icon?: string | null;
  isActive: boolean;
};

type Props = {
  companySlug: string;
  services: UnifiedServiceRow[];
};

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "ACTIVE", label: "Ativos" },
  { id: "INACTIVE", label: "Desabilitados" },
];

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function ServicosClient({ companySlug, services: initialServices }: Props) {
  const company = useCompany();
  const router = useRouter();

  const [servicesList, setServicesList] = useState<UnifiedServiceRow[]>(initialServices);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPending, startTransition] = useTransition();

  const [confirmService, setConfirmService] = useState<{
    id: string;
    name: string;
    currentIsActive: boolean;
  } | null>(null);

  function executeToggleDisable() {
    if (!confirmService) return;
    const { id, name, currentIsActive } = confirmService;

    startTransition(async () => {
      const res = await toggleDisableServiceAction(companySlug, id);
      if (res.success) {
        toast.success(
          currentIsActive ? "Desabilitado!" : "Reativado!",
          `Serviço '${name}' ${currentIsActive ? "desabilitado" : "reativado"} com sucesso.`
        );
        setServicesList((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isActive: !currentIsActive } : s))
        );
        setConfirmService(null);
        router.refresh();
      } else {
        toast.error("Erro", "Falha ao alterar status do serviço.");
      }
    });
  }

  const inactiveCount = servicesList.filter((s) => !s.isActive).length;

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return servicesList.filter((s) => {
      if (status === "ACTIVE" && !s.isActive) return false;
      if (status === "INACTIVE" && s.isActive) return false;
      if (!term) return true;
      return (
        s.name.toLowerCase().includes(term) ||
        (s.description?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [servicesList, searchTerm, status]);

  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const hasActiveFilter = status !== "ALL" || searchTerm.trim().length > 0;

  function resetFilters() {
    setSearchTerm("");
    setStatus("ALL");
    setCurrentPage(1);
  }

  return (
    <div className="page-container pb-20">
      <div className="page-content space-y-6">
        <PageHeader
          category="Catálogo"
          categoryIcon={<Scissors className="w-3.5 h-3.5" />}
          title="Serviços"
          description="O que sua empresa oferece, por quanto e em quanto tempo. É esta lista que o cliente vê ao agendar."
          action={
            <Link
              href={`/${companySlug}/servicos/novo`}
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo serviço</span>
            </Link>
          }
        />

        {/* Filtro de status: um serviço desabilitado continua no catálogo, só
            some da vitrine — por isso "Desabilitados" é uma visão, não um
            depósito de lixo. */}
        <div className="scroller -mx-1 px-1">
          <div
            className="segmented w-max"
            role="tablist"
            aria-label="Filtrar serviços por status"
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={status === tab.id}
                data-active={status === tab.id}
                onClick={() => {
                  setStatus(tab.id);
                  setCurrentPage(1);
                }}
                className="segmented-item whitespace-nowrap inline-flex items-center gap-1.5"
              >
                <span>{tab.label}</span>
                {tab.id === "INACTIVE" && inactiveCount > 0 && (
                  <span className="badge badge-count badge-neutral">{inactiveCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar">
          <SearchInput
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nome ou descrição"
          />
          <span className="toolbar-spacer" />
          <span className="text-[var(--color-text-muted)] tabular-nums" style={{ fontSize: "var(--text-xs)" }}>
            {filteredServices.length}{" "}
            {filteredServices.length === 1 ? "serviço" : "serviços"}
          </span>
        </div>

        {filteredServices.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Scissors className="w-5 h-5" />}
              title={
                hasActiveFilter
                  ? "Nenhum serviço com esses filtros"
                  : "Seu catálogo ainda está vazio"
              }
              description={
                hasActiveFilter
                  ? "Nenhum serviço corresponde à busca ou ao status selecionado."
                  : "Cadastre o primeiro serviço para que os clientes possam agendar. Nome, preço e duração já bastam para começar."
              }
              action={
                hasActiveFilter ? (
                  <button type="button" onClick={resetFilters} className="btn btn-outline btn-sm">
                    Limpar filtros
                  </button>
                ) : (
                  <Link
                    href={`/${companySlug}/servicos/novo`}
                    className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar serviço</span>
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="table-container" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Tipo</th>
                    <th className="text-right">Valor</th>
                    <th className="text-right">Duração</th>
                    <th>Status</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedServices.map((srv) => (
                    <tr key={srv.id} className={srv.isActive ? "" : "opacity-65"}>
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-9 h-9 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)] grid place-items-center shrink-0"
                            aria-hidden="true"
                          >
                            {srv.icon ? (
                              <RenderServiceIcon iconName={srv.icon} className="w-4 h-4" />
                            ) : (
                              <Scissors className="w-4 h-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--color-text-heading)] truncate">
                              {srv.name}
                            </p>
                            {srv.description && (
                              <p
                                className="text-[var(--color-text-muted)] truncate max-w-sm"
                                style={{ fontSize: "var(--text-xs)" }}
                              >
                                {srv.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tipo é categoria, não estado — por isso vai em rótulo
                          neutro e não em distintivo colorido. */}
                      <td>
                        <span className="eyebrow">{srv.type}</span>
                      </td>

                      <td data-type="number">
                        {formatMoney(srv.price, company.currency, company.locale)}
                      </td>

                      <td data-type="number">{formatDuration(srv.estimatedMinutes)}</td>

                      <td>
                        <StatusBadge variant={srv.isActive ? "success" : "neutral"}>
                          {srv.isActive ? "Ativo" : "Inativo"}
                        </StatusBadge>
                      </td>

                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          <ActionTooltip label="Editar serviço">
                            <Link
                              href={`/${companySlug}/servicos/${srv.id}/editar`}
                              className="btn btn-ghost btn-icon"
                              aria-label={`Editar ${srv.name}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>
                          </ActionTooltip>

                          <ActionTooltip
                            label={srv.isActive ? "Desabilitar serviço" : "Reativar serviço"}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmService({
                                  id: srv.id,
                                  name: srv.name,
                                  currentIsActive: srv.isActive,
                                })
                              }
                              disabled={isPending}
                              className="btn btn-ghost btn-icon"
                              aria-label={`${srv.isActive ? "Desabilitar" : "Reativar"} ${srv.name}`}
                            >
                              {srv.isActive ? (
                                <Ban className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </ActionTooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredServices.length}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50, 100]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="serviços"
            />
          </div>
        )}
      </div>

      {confirmService && (
        <ConfirmDialog
          isOpen={Boolean(confirmService)}
          onClose={() => setConfirmService(null)}
          onConfirm={executeToggleDisable}
          title={
            confirmService.currentIsActive ? "Desabilitar serviço" : "Reativar serviço"
          }
          description={
            confirmService.currentIsActive
              ? `"${confirmService.name}" deixa de aparecer para os clientes agendarem. Os agendamentos já marcados continuam valendo, e você pode reativar quando quiser.`
              : `"${confirmService.name}" volta a aparecer para os clientes agendarem.`
          }
          variant={confirmService.currentIsActive ? "warning" : "success"}
          confirmText={confirmService.currentIsActive ? "Desabilitar" : "Reativar"}
          isLoading={isPending}
        />
      )}
    </div>
  );
}
