"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setProfessionalActiveAction } from "@/server/actions/professionals";
import { toast } from "@/lib/toast-service";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconAction, RowActions } from "@/components/ui/icon-action";
import { Pagination } from "@/components/ui/pagination";
import { Users, Plus, AlertTriangle } from "@/components/ui/icons";

// Removidos daqui `IconPencil` e `IconTrash`: SVGs escritos à mão, nunca
// usados, com o traçado da lixeira malformado. O conjunto de ícones da
// aplicação já tem os dois.

type Professional = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  roleTitle?: string | null;
  commissionRate?: number | null;
  commissionPercentage?: number | null;
  isActive?: boolean;
};

type Props = {
  companySlug: string;
  professionals: Professional[];
  limit: number | null;
};

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "ACTIVE", label: "Ativos" },
  { id: "INACTIVE", label: "Desativados" },
];

export function ProfissionaisClient({ companySlug, professionals, limit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmTarget, setConfirmTarget] = useState<Professional | null>(null);

  const activeCount = professionals.filter((p) => p.isActive !== false).length;
  const inactiveCount = professionals.length - activeCount;

  // O limite do plano conta só quem está ativo — desativado não ocupa vaga.
  const atLimit = limit !== null && activeCount >= limit;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return professionals.filter((p) => {
      const isActive = p.isActive !== false;
      if (status === "ACTIVE" && !isActive) return false;
      if (status === "INACTIVE" && isActive) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        (p.email?.toLowerCase().includes(term) ?? false) ||
        (p.roleTitle?.toLowerCase().includes(term) ?? false)
      );
    });
  }, [professionals, searchTerm, status]);

  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const hasActiveFilter = status !== "ALL" || searchTerm.trim().length > 0;

  function handleToggleActive() {
    if (!confirmTarget) return;
    const target = confirmTarget;
    const nextActive = target.isActive === false;

    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", target.id);
    fd.set("isActive", String(nextActive));

    startTransition(async () => {
      const res = await setProfessionalActiveAction(fd);
      // A versão anterior ignorava o retorno e sempre mostrava sucesso.
      if (!res.success) {
        toast.error(
          "Não foi possível alterar",
          res.errors?._?.[0] ?? "Tente novamente."
        );
        return;
      }
      toast.success(
        nextActive ? "Profissional reativado" : "Profissional desativado",
        target.name
      );
      setConfirmTarget(null);
      router.refresh();
    });
  }

  /** `null`/`undefined` viram "padrão" — antes renderizavam "null%". */
  function commissionLabel(p: Professional): string {
    const rate = p.commissionRate ?? p.commissionPercentage;
    return rate === null || rate === undefined ? "Padrão" : `${rate}%`;
  }

  return (
    <div className="page-container pb-20">
      <div className="page-content space-y-6">
        <PageHeader
          category="Equipe"
          categoryIcon={<Users className="w-3.5 h-3.5" />}
          title="Profissionais"
          description="Quem atende, com qual cargo e qual comissão. Só os ativos aparecem para o cliente agendar."
          action={
            <Link
              href={`/${companySlug}/profissionais/novo`}
              aria-disabled={atLimit}
              className={`btn btn-primary btn-sm inline-flex items-center gap-1.5 ${
                atLimit ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo profissional</span>
            </Link>
          }
        />

        {atLimit && (
          <div className="alert alert-warning">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Você atingiu o limite de {limit} profissional(is) ativo(s) do seu
              plano. Desative alguém ou faça upgrade para adicionar mais.
            </span>
          </div>
        )}

        <div className="scroller -mx-1 px-1">
          <div
            className="segmented w-max"
            role="tablist"
            aria-label="Filtrar profissionais por status"
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
                  <span className="badge badge-count badge-neutral">
                    {inactiveCount}
                  </span>
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
            placeholder="Buscar por nome, e-mail ou cargo"
          />
          <span className="toolbar-spacer" />
          <span
            className="text-[var(--color-text-muted)] tabular-nums"
            style={{ fontSize: "var(--text-xs)" }}
          >
            {limit !== null
              ? `${activeCount} de ${limit} ativos`
              : `${activeCount} ativo${activeCount === 1 ? "" : "s"}`}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Users className="w-5 h-5" />}
              title={
                hasActiveFilter
                  ? "Nenhum profissional com esses filtros"
                  : "Nenhum profissional cadastrado"
              }
              description={
                hasActiveFilter
                  ? "Nenhum profissional corresponde à busca ou ao status selecionado."
                  : "Cadastre quem atende para que os clientes possam escolher o profissional ao agendar."
              }
              action={
                hasActiveFilter ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatus("ALL");
                      setCurrentPage(1);
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    Limpar filtros
                  </button>
                ) : (
                  <Link
                    href={`/${companySlug}/profissionais/novo`}
                    className="btn btn-primary btn-sm"
                  >
                    Cadastrar profissional
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div
              className="table-container"
              style={{ border: 0, borderRadius: 0, boxShadow: "none" }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Profissional</th>
                    <th scope="col">Contato</th>
                    <th scope="col" className="text-right">
                      Comissão
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((pro) => {
                    const isActive = pro.isActive !== false;
                    return (
                      <tr key={pro.id} className={isActive ? "" : "opacity-65"}>
                        <td>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-9 h-9 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-text-muted)] grid place-items-center font-medium shrink-0 overflow-hidden">
                              {pro.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={pro.avatarUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                pro.name[0]?.toUpperCase()
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--color-text-heading)] truncate">
                                {pro.name}
                              </p>
                              <span
                                className="block text-[var(--color-text-muted)] truncate"
                                style={{ fontSize: "var(--text-xs)" }}
                              >
                                {pro.roleTitle || "Sem cargo definido"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <p className="text-[var(--color-text)] truncate">
                            {pro.email || "—"}
                          </p>
                          <span
                            className="block text-[var(--color-text-subtle)] font-mono"
                            style={{ fontSize: "var(--text-xs)" }}
                          >
                            {pro.phone || "—"}
                          </span>
                        </td>

                        <td data-type="number">{commissionLabel(pro)}</td>

                        <td>
                          <StatusBadge variant={isActive ? "success" : "neutral"}>
                            {isActive ? "Ativo" : "Inativo"}
                          </StatusBadge>
                        </td>

                        <td>
                          <RowActions>
                            <IconAction
                              intent="edit"
                              label={`Editar ${pro.name}`}
                              href={`/${companySlug}/profissionais/${pro.id}/editar`}
                            />
                            {/* Ícone e rótulo agora batem com o que a ação faz:
                                ela marca `isActive`, não apaga o registro. */}
                            <IconAction
                              intent={isActive ? "deactivate" : "activate"}
                              label={`${isActive ? "Desativar" : "Reativar"} ${pro.name}`}
                              onClick={() => setConfirmTarget(pro)}
                              pending={isPending}
                            />
                          </RowActions>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50, 100]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="profissionais"
            />
          </div>
        )}
      </div>

      {confirmTarget && (
        <ConfirmDialog
          isOpen={Boolean(confirmTarget)}
          onClose={() => setConfirmTarget(null)}
          onConfirm={handleToggleActive}
          title={
            confirmTarget.isActive === false
              ? "Reativar profissional"
              : "Desativar profissional"
          }
          description={
            confirmTarget.isActive === false
              ? `${confirmTarget.name} volta a aparecer para os clientes escolherem ao agendar.`
              : `${confirmTarget.name} deixa de aparecer para os clientes agendarem e libera uma vaga do plano. Os agendamentos já marcados continuam valendo, e você pode reativar quando quiser.`
          }
          variant={confirmTarget.isActive === false ? "success" : "warning"}
          confirmText={confirmTarget.isActive === false ? "Reativar" : "Desativar"}
          isLoading={isPending}
        />
      )}
    </div>
  );
}
