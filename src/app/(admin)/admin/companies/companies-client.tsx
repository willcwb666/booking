"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTransition, useState, useMemo } from "react";
import { toggleCompanyActiveAction } from "@/server/actions/admin";
import type { AdminCompanyItem } from "@/server/queries/admin";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { ResetPresetModal } from "../empresas/_components/reset-preset-modal";
import { Building2, Search, Filter, RotateCcw, ExternalLink } from "@/components/ui/icons";

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

type SortField = "name" | "businessType" | "planName" | "memberCount" | "bookingCount" | "isActive";
type SortDirection = "asc" | "desc";

function ToggleActiveButton({
  companyId,
  isActive,
}: {
  companyId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleCompanyActiveAction(companyId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <ActionTooltip label={isActive ? "Desativar Empresa" : "Ativar Empresa"}>
        <button
          onClick={handleToggle}
          disabled={pending}
          className={[
            "p-2 text-xs font-bold rounded-lg border transition-all cursor-pointer disabled:opacity-50",
            isActive
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
          ].join(" ")}
        >
          {pending ? "…" : isActive ? "🚫" : "✅"}
        </button>
      </ActionTooltip>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export function AdminCompaniesClient({
  items,
  total,
  page,
  pageCount,
  search,
}: {
  items: SerializedItem[];
  total: number;
  page: number;
  pageCount: number;
  search: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedForReset, setSelectedForReset] = useState<SerializedItem | null>(null);

  // Filtros locais avançados
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Ordenação das colunas
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  function handleHeaderClick(field: SortField) {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // Filtragem e ordenação dinâmica em tempo real
  const processedItems = useMemo(() => {
    let result = [...items];

    // 1. Filtros
    if (typeFilter !== "ALL") {
      result = result.filter((item) => item.businessType === typeFilter);
    }
    if (planFilter !== "ALL") {
      result = result.filter((item) => item.planName?.toLowerCase().includes(planFilter.toLowerCase()));
    }
    if (statusFilter !== "ALL") {
      const isAct = statusFilter === "ACTIVE";
      result = result.filter((item) => item.isActive === isAct);
    }

    // 2. Ordenação por Coluna (Alfabética ou Numérica)
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "businessType") {
        valA = BUSINESS_TYPE_LABELS[a.businessType] || a.businessType;
        valB = BUSINESS_TYPE_LABELS[b.businessType] || b.businessType;
      }

      if (typeof valA === "string") {
        const cmp = valA.localeCompare(valB, "pt-BR", { sensitivity: "base" });
        return sortDir === "asc" ? cmp : -cmp;
      }

      if (typeof valA === "boolean") {
        const numA = valA ? 1 : 0;
        const numB = valB ? 1 : 0;
        return sortDir === "asc" ? numA - numB : numB - numA;
      }

      return sortDir === "asc" ? valA - valB : valB - valA;
    });

    return result;
  }, [items, typeFilter, planFilter, statusFilter, sortField, sortDir]);

  function buildUrl(updates: { q?: string; page?: number }) {
    const params = new URLSearchParams();
    const q = updates.q ?? search;
    const p = updates.page ?? page;
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    router.push(buildUrl({ q: (fd.get("q") as string) ?? "", page: 1 }));
  }

  function renderSortIndicator(field: SortField) {
    if (sortField !== field) return <span className="text-slate-300 ml-1 text-[10px]">↕</span>;
    return <span className="text-[var(--color-primary)] font-black ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  return (
    <div className="w-full max-w-7xl px-6 sm:px-8 py-8 text-left space-y-6">
      <ResetPresetModal
        company={selectedForReset}
        onClose={() => setSelectedForReset(null)}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
          <Building2 className="w-4 h-4" />
          <span>Gestão de Empresas</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
          Empresas Cadastradas ({total})
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Filtre por tipo de negócio, plano ou status e ordene as colunas alfabeticamente.
        </p>
      </div>

      {/* Controles de Busca e Filtros Combinados */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Busca por texto */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full">
            <input
              name="q"
              defaultValue={search}
              placeholder="Buscar por nome ou slug..."
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full font-medium"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Buscar
            </button>
            {search && (
              <Link href={pathname} className="px-3 py-2.5 text-xs text-slate-400 hover:text-slate-600 flex items-center">
                Limpar
              </Link>
            )}
          </form>

          {/* Filtros em Dropdown */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Filtro por Tipo */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="ALL">Todos os Tipos</option>
                {Object.entries(BUSINESS_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Plano */}
            <div>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="ALL">Todos os Planos</option>
                <option value="starter">Starter</option>
                <option value="normal">Normal</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Filtro por Status */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ACTIVE">Ativa</option>
                <option value="INACTIVE">Inativa</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Empresas com Cabeçalhos Clicáveis de Ordenação */}
      {processedItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-2xs">
          <p className="text-slate-500 text-xs font-semibold">Nenhuma empresa encontrada com os filtros selecionados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50 text-slate-600 font-extrabold uppercase tracking-wider">
                  <th
                    scope="col"
                    onClick={() => handleHeaderClick("name")}
                    className="text-left px-5 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Empresa {renderSortIndicator("name")}
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleHeaderClick("businessType")}
                    className="text-left px-5 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Tipo {renderSortIndicator("businessType")}
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleHeaderClick("planName")}
                    className="text-left px-5 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Plano {renderSortIndicator("planName")}
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleHeaderClick("memberCount")}
                    className="text-center px-5 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Membros {renderSortIndicator("memberCount")}
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleHeaderClick("bookingCount")}
                    className="text-center px-5 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Agendamentos {renderSortIndicator("bookingCount")}
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleHeaderClick("isActive")}
                    className="text-left px-5 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                  >
                    Status {renderSortIndicator("isActive")}
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {processedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[11px] text-slate-400">/{item.slug}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {BUSINESS_TYPE_LABELS[item.businessType] ?? item.businessType}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-semibold">{item.planName}</td>
                    <td className="px-5 py-3.5 text-center text-slate-700 font-bold">{item.memberCount}</td>
                    <td className="px-5 py-3.5 text-center text-slate-700 font-bold">{item.bookingCount}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.isActive ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botão Reset de Presets */}
                        <ActionTooltip label="Resetar Presets de Serviços">
                          <button
                            type="button"
                            onClick={() => setSelectedForReset(item)}
                            className="p-2 border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </ActionTooltip>

                        {/* Botão Acessar Painel da Empresa */}
                        {item.isActive && (
                          <ActionTooltip label="Acessar Painel da Empresa">
                            <Link
                              href={`/${item.slug}/dashboard`}
                              className="p-2 text-xs font-bold text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-lg hover:bg-[var(--color-primary-light)] transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </ActionTooltip>
                        )}

                        <ToggleActiveButton companyId={item.id} isActive={item.isActive} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between text-xs">
              <p className="text-slate-500 font-medium">Página {page} de {pageCount}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={buildUrl({ page: page - 1 })} className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-bold text-slate-700">
                    Anterior
                  </Link>
                )}
                {page < pageCount && (
                  <Link href={buildUrl({ page: page + 1 })} className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-bold text-slate-700">
                    Próxima
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
