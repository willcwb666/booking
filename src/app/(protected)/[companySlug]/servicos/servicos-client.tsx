"use client";

import React, { useState, useTransition } from "react";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPending, startTransition] = useTransition();

  // ConfirmDialog State
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
        setServicesList(
          servicesList.map((s) =>
            s.id === id ? { ...s, isActive: !currentIsActive } : s
          )
        );
        router.refresh();
      } else {
        toast.error("Erro", "Falha ao alterar status do serviço.");
      }
    });
  }

  const filteredServices = servicesList.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="w-full max-w-7xl px-6 sm:px-10 py-8 text-left space-y-8 pb-32">
      {/* Header Padronizado */}
      <PageHeader
        category="Catálogo de Atendimentos"
        categoryIcon={<Scissors className="w-4 h-4" />}
        title="Lista de Serviços"
        description="Gerencie o catálogo de serviços, modalidades e adicionais oferecidos na sua empresa."
        action={
          <Link
            href={`/${companySlug}/servicos/novo`}
            className="px-6 py-3 bg-[#635bff] hover:bg-[#544dc9] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 uppercase"
          >
            <Plus className="w-4 h-4" />
            <span>+ SERVIÇO</span>
          </Link>
        }
      />

      {/* Busca Rápida & Tabela Principal */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SearchInput
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Buscar serviço por nome ou descrição..."
          />

          <span className="text-xs text-slate-500 font-medium">
            Total: {filteredServices.length} serviço(s)
          </span>
        </div>

        {/* TABELA DE SERVIÇOS */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                <th className="px-4 py-3">Ícone & Descrição do Serviço</th>
                <th className="px-4 py-3 text-center">Tipo</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Duração</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon={<Scissors className="w-6 h-6" />}
                      title="Nenhum serviço encontrado"
                      description="Não encontramos nenhum serviço com o termo buscado ou no catálogo atual."
                      action={
                        <Link
                          href={`/${companySlug}/servicos/novo`}
                          className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors inline-block"
                        >
                          Cadastrar Novo Serviço
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                paginatedServices.map((srv) => (
                  <tr
                    key={srv.id}
                    className={`hover:bg-slate-50/60 transition-colors ${
                      !srv.isActive ? "opacity-50 bg-slate-50/30" : ""
                    }`}
                  >
                    {/* Ícone + Descrição */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/80">
                          {srv.icon ? (
                            <RenderServiceIcon iconName={srv.icon} className="w-5 h-5" />
                          ) : (
                            <Scissors className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-slate-900 text-sm">{srv.name}</p>
                            {!srv.isActive && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">
                                Desativado
                              </span>
                            )}
                          </div>
                          {srv.description && (
                            <p className="text-slate-500 text-[11px] mt-0.5 max-w-sm truncate">
                              {srv.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge
                        variant={srv.type === "PADRÃO" ? "primary" : "warning"}
                        size="sm"
                      >
                        {srv.type}
                      </StatusBadge>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 text-sm">
                      {formatMoney(srv.price, company.currency, company.locale)}
                    </td>

                    {/* Duração */}
                    <td className="px-4 py-3.5 text-center text-slate-600 font-semibold">
                      {formatDuration(srv.estimatedMinutes)}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <ActionTooltip label="Editar Serviço">
                        <Link
                          href={`/${companySlug}/servicos/${srv.id}/editar`}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all inline-flex items-center justify-center shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                      </ActionTooltip>

                      <ActionTooltip label={srv.isActive ? "Desabilitar Serviço" : "Reativar Serviço"}>
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
                          className={`p-2 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer shadow-2xs ${
                            srv.isActive
                              ? "bg-amber-50 hover:bg-amber-100 text-amber-700"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {srv.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </ActionTooltip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredServices.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredServices.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="serviços"
          />
        )}
      </div>

      {/* Modal de Confirmação Reutilizável */}
      {confirmService && (
        <ConfirmDialog
          isOpen={Boolean(confirmService)}
          onClose={() => setConfirmService(null)}
          onConfirm={executeToggleDisable}
          title={
            confirmService.currentIsActive
              ? "Desabilitar Serviço"
              : "Reativar Serviço"
          }
          description={`Tem certeza que deseja ${
            confirmService.currentIsActive ? "desabilitar" : "reativar"
          } o serviço '${confirmService.name}'?`}
          variant={confirmService.currentIsActive ? "warning" : "success"}
          confirmText={confirmService.currentIsActive ? "Desabilitar" : "Reativar"}
          isLoading={isPending}
        />
      )}
    </div>
  );
}
