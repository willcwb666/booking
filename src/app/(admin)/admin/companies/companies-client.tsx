"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toggleCompanyActiveAction } from "@/server/actions/admin";
import type { AdminCompanyItem, AdminCompanySort } from "@/server/queries/admin";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconAction, RowActions } from "@/components/ui/icon-action";
import { toast } from "@/lib/toast-service";
import { ResetPresetModal } from "../empresas/_components/reset-preset-modal";
import { Building2, Search, X } from "@/components/ui/icons";

type SerializedItem = Omit<AdminCompanyItem, "createdAt"> & { createdAt: string };

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  HOME_CLEANING: "Limpeza residencial",
  PET_GROOMER: "Pet groomer",
  CAR_WASH: "Lava-rápido",
  POOL_CLEANING: "Limpeza de piscina",
  LAWN_CARE: "Jardinagem",
  BARBER: "Barbearia",
  HAIR_SALON: "Salão de beleza",
  PHOTOGRAPHER: "Fotógrafo",
  OTHER: "Outro",
};

type Filters = {
  q: string;
  type: string;
  plan: string;
  status: string;
  sort: AdminCompanySort;
  dir: "asc" | "desc";
};

type Options = {
  plans: { id: string; displayName: string }[];
  businessTypes: { value: string; count: number }[];
};

const COLUMNS: { field: AdminCompanySort; label: string; numeric?: boolean }[] = [
  { field: "name", label: "Empresa" },
  { field: "businessType", label: "Tipo" },
  { field: "planName", label: "Plano" },
  { field: "memberCount", label: "Membros", numeric: true },
  { field: "bookingCount", label: "Agendamentos", numeric: true },
  { field: "isActive", label: "Status" },
];

export function AdminCompaniesClient({
  items,
  total,
  page,
  pageSize = 10,
  filters,
  options,
}: {
  items: SerializedItem[];
  total: number;
  page: number;
  pageSize?: number;
  pageCount: number;
  filters: Filters;
  options: Options;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [selectedForReset, setSelectedForReset] = useState<SerializedItem | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<SerializedItem | null>(null);
  const [searchDraft, setSearchDraft] = useState(filters.q);

  /**
   * Todo filtro vive na URL e é resolvido no servidor. A versão anterior
   * filtrava e ordenava em memória a página corrente — dez linhas — enquanto a
   * paginação continuava anunciando o total geral.
   */
  function buildUrl(patch: Partial<Filters & { page: number; pageSize: number }>) {
    const params = new URLSearchParams();
    const merged = {
      q: patch.q ?? filters.q,
      type: patch.type ?? filters.type,
      plan: patch.plan ?? filters.plan,
      status: patch.status ?? filters.status,
      sort: patch.sort ?? filters.sort,
      dir: patch.dir ?? filters.dir,
      page: patch.page ?? page,
      pageSize: patch.pageSize ?? pageSize,
    };
    if (merged.q) params.set("q", merged.q);
    if (merged.type) params.set("type", merged.type);
    if (merged.plan) params.set("plan", merged.plan);
    if (merged.status) params.set("status", merged.status);
    if (merged.sort !== "createdAt") params.set("sort", merged.sort);
    if (merged.dir !== "desc") params.set("dir", merged.dir);
    if (merged.page > 1) params.set("page", String(merged.page));
    if (merged.pageSize !== 10) params.set("pageSize", String(merged.pageSize));
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function go(patch: Parameters<typeof buildUrl>[0]) {
    // Trocar filtro sempre volta para a página 1: manter a página 12 depois de
    // reduzir o resultado a 3 linhas mostra uma tabela vazia sem explicação.
    startTransition(() =>
      router.push(buildUrl({ page: 1, ...patch }), { scroll: false })
    );
  }

  function sortBy(field: AdminCompanySort) {
    const dir =
      filters.sort === field && filters.dir === "asc" ? "desc" : "asc";
    go({ sort: field, dir });
  }

  function handleToggleActive() {
    if (!confirmToggle) return;
    const target = confirmToggle;
    startTransition(async () => {
      const result = await toggleCompanyActiveAction(target.id);
      if (!result.success) {
        // Antes o erro era impresso dentro da célula da tabela, quebrando o
        // alinhamento da linha e sumindo no scroll horizontal.
        toast.error("Não foi possível alterar", result.error);
        return;
      }
      toast.success(
        target.isActive ? "Empresa desativada" : "Empresa ativada",
        target.name
      );
      setConfirmToggle(null);
      router.refresh();
    });
  }

  const hasActiveFilter = Boolean(
    filters.q || filters.type || filters.plan || filters.status
  );

  return (
    <div className="page-content space-y-6">
      <ResetPresetModal
        company={selectedForReset}
        onClose={() => setSelectedForReset(null)}
      />

      <PageHeader
        category="Plataforma"
        categoryIcon={<Building2 className="w-3.5 h-3.5" />}
        title="Empresas"
        description="Todos os estabelecimentos da base. Filtre, ordene e entre no painel de qualquer um."
        action={
          <span className="eyebrow">
            {total} {total === 1 ? "empresa" : "empresas"}
          </span>
        }
      />

      <div className="toolbar" data-pending={isPending || undefined}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: searchDraft.trim() });
          }}
          className="relative max-w-xs w-full"
          role="search"
        >
          <Search className="w-4 h-4 text-[var(--color-text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Nome ou slug"
            aria-label="Buscar empresa"
            className="input pl-9"
          />
        </form>

        <select
          value={filters.type}
          onChange={(e) => go({ type: e.target.value })}
          aria-label="Tipo de negócio"
          className="input"
          style={{ width: "auto" }}
        >
          <option value="">Todos os tipos</option>
          {options.businessTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {BUSINESS_TYPE_LABELS[t.value] ?? t.value} ({t.count})
            </option>
          ))}
        </select>

        {/* Os planos vêm do banco. Antes eram três opções fixas no código
            (starter/normal/advanced), então qualquer plano cadastrado pelo
            super admin ficava impossível de filtrar. */}
        <select
          value={filters.plan}
          onChange={(e) => go({ plan: e.target.value })}
          aria-label="Plano"
          className="input"
          style={{ width: "auto" }}
        >
          <option value="">Todos os planos</option>
          {options.plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => go({ status: e.target.value })}
          aria-label="Status"
          className="input"
          style={{ width: "auto" }}
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativas</option>
          <option value="INACTIVE">Inativas</option>
        </select>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setSearchDraft("");
              startTransition(() => router.push(pathname, { scroll: false }));
            }}
            className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Building2 className="w-5 h-5" />}
            title={
              hasActiveFilter
                ? "Nenhuma empresa com esses filtros"
                : "Nenhuma empresa cadastrada"
            }
            description={
              hasActiveFilter
                ? "Nenhuma empresa em toda a base corresponde à combinação selecionada."
                : "Assim que o primeiro estabelecimento se cadastrar, ele aparece aqui."
            }
            action={
              hasActiveFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft("");
                    router.push(pathname);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Limpar filtros
                </button>
              ) : undefined
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
                  {COLUMNS.map((col) => {
                    const active = filters.sort === col.field;
                    return (
                      <th
                        key={col.field}
                        scope="col"
                        aria-sort={
                          active
                            ? filters.dir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className={col.numeric ? "text-right" : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => sortBy(col.field)}
                          className={`inline-flex items-center gap-1 ${
                            col.numeric ? "flex-row-reverse" : ""
                          } ${active ? "text-[var(--color-primary)]" : ""}`}
                        >
                          <span>{col.label}</span>
                          <span aria-hidden="true" className="opacity-60">
                            {active ? (filters.dir === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th scope="col" className="text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium text-[var(--color-text-heading)]">
                        {item.name}
                      </p>
                      <p className="eyebrow">/{item.slug}</p>
                    </td>
                    <td className="text-[var(--color-text-muted)]">
                      {BUSINESS_TYPE_LABELS[item.businessType] ?? item.businessType}
                    </td>
                    <td className="text-[var(--color-text-muted)]">
                      {item.planName}
                    </td>
                    <td data-type="number">{item.memberCount}</td>
                    <td data-type="number">{item.bookingCount}</td>
                    <td>
                      <StatusBadge variant={item.isActive ? "success" : "neutral"}>
                        {item.isActive ? "Ativo" : "Inativo"}
                      </StatusBadge>
                    </td>
                    <td>
                      <RowActions>
                        {item.isActive && (
                          <IconAction
                            intent="open"
                            label={`Abrir painel de ${item.name}`}
                            href={`/${item.slug}/dashboard`}
                          />
                        )}
                        <IconAction
                          intent="reset"
                          label={`Restaurar serviços padrão de ${item.name}`}
                          onClick={() => setSelectedForReset(item)}
                        />
                        <IconAction
                          intent={item.isActive ? "deactivate" : "activate"}
                          label={`${item.isActive ? "Desativar" : "Ativar"} ${item.name}`}
                          onClick={() => setConfirmToggle(item)}
                          pending={isPending}
                        />
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50, 100]}
            onPageChange={(newPage) => router.push(buildUrl({ page: newPage }))}
            onPageSizeChange={(newSize) =>
              router.push(buildUrl({ page: 1, pageSize: newSize }))
            }
            itemLabel="empresas"
          />
        </div>
      )}

      {/* Desativar bloqueia o acesso de todos os usuários da empresa. Antes
          acontecia em um clique, sem confirmação. */}
      {confirmToggle && (
        <ConfirmDialog
          isOpen={Boolean(confirmToggle)}
          onClose={() => setConfirmToggle(null)}
          onConfirm={handleToggleActive}
          title={
            confirmToggle.isActive ? "Desativar empresa" : "Reativar empresa"
          }
          description={
            confirmToggle.isActive
              ? `"${confirmToggle.name}" perde o acesso ao sistema — todos os ${confirmToggle.memberCount} membro(s) ficam sem entrar. Os dados são preservados e você pode reativar quando quiser.`
              : `"${confirmToggle.name}" volta a ter acesso ao sistema.`
          }
          variant={confirmToggle.isActive ? "warning" : "success"}
          confirmText={confirmToggle.isActive ? "Desativar" : "Reativar"}
          isLoading={isPending}
        />
      )}
    </div>
  );
}
