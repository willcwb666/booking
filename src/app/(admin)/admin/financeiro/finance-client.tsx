"use client";

import React, { useState, useTransition, useMemo } from "react";
import type { AdminFinanceCompanyItem, AdminStats } from "@/server/queries/admin";
import { syncAllCompanyPlansWithStripeAction } from "@/server/actions/admin-subscriptions";
import { updateCompanySubscriptionAction, cancelDuplicateSubscriptionsAction } from "@/server/actions/admin-finance";
import { toast } from "@/lib/toast-service";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  CreditCard,
  Settings,
  X,
  DollarSign,
  RefreshCw,
  Search,
} from "@/components/ui/icons";

type PlanOption = {
  id: string;
  displayName: string;
  priceMonthly: number;
  priceYearly: number;
};

type Props = {
  initialCompanies: AdminFinanceCompanyItem[];
  stats: AdminStats;
  availablePlans: PlanOption[];
};

import { SubscriptionsModal } from "./_components/subscriptions-modal";
import { Pagination } from "@/components/ui/pagination";

import { IconAction, RowActions } from "@/components/ui/icon-action";
import { PageHeader } from "@/components/ui/page-header";
export function FinanceClient({ initialCompanies, stats, availablePlans }: Props) {
  const [companies, setCompanies] = useState<AdminFinanceCompanyItem[]>(initialCompanies);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [editingCompany, setEditingCompany] = useState<AdminFinanceCompanyItem | null>(null);
  const [inspectingCompany, setInspectingCompany] = useState<AdminFinanceCompanyItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  // Recálculo dinâmico em tempo real de MRR, ARR, ARPU e Inadimplência
  const liveStats = useMemo(() => {
    let mrr = 0;
    let activeSubscriptionsCount = 0;
    let overdueSubscriptionsCount = 0;

    for (const comp of companies) {
      const status = comp.subscriptionStatus;
      if (status === "past_due" || status === "unpaid") {
        overdueSubscriptionsCount++;
      } else if (status !== "canceled") {
        activeSubscriptionsCount++;
        const priceMonthly = Number(comp.planMonthlyPrice || 0);
        const priceYearly = Number(comp.planYearlyPrice || 0);
        if (comp.subscriptionInterval === "year" && priceYearly > 0) {
          mrr += priceYearly / 12;
        } else {
          mrr += priceMonthly;
        }
      }
    }

    const arr = mrr * 12;
    const arpu = activeSubscriptionsCount > 0 ? mrr / activeSubscriptionsCount : 0;

    return {
      mrr,
      arr,
      arpu,
      activeSubscriptionsCount,
      overdueSubscriptionsCount,
      totalRevenue: stats.totalRevenue,
    };
  }, [companies, stats.totalRevenue]);

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "OVERDUE") return c.subscriptionStatus === "past_due" || c.subscriptionStatus === "unpaid";
    if (statusFilter === "ACTIVE") return c.subscriptionStatus === "active" || c.subscriptionStatus === "trialing" || !c.subscriptionStatus;
    if (statusFilter === "CANCELED") return c.subscriptionStatus === "canceled";

    return true;
  });

  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function handleOpenEdit(c: AdminFinanceCompanyItem) {
    setEditingCompany(c);
    setSelectedStatus(c.subscriptionStatus || "active");
    const matchedPlan = availablePlans.find((p) => p.displayName === c.planName);
    setSelectedPlanId(matchedPlan ? matchedPlan.id : availablePlans[0]?.id || "");
  }

  function handleSaveSubscription() {
    if (!editingCompany) return;

    startTransition(async () => {
      const res = await updateCompanySubscriptionAction(
        editingCompany.id,
        selectedStatus,
        selectedPlanId
      );

      if (res.success) {
        toast.success("Assinatura Atualizada", "Status financeiro da empresa salvo com sucesso.");
        setCompanies((prev) =>
          prev.map((item) => {
            if (item.id === editingCompany.id) {
              const matchedPlan = availablePlans.find((p) => p.id === selectedPlanId);
              return {
                ...item,
                subscriptionStatus: selectedStatus,
                planName: matchedPlan ? matchedPlan.displayName : item.planName,
                planMonthlyPrice: matchedPlan ? matchedPlan.priceMonthly : item.planMonthlyPrice,
                planYearlyPrice: matchedPlan ? matchedPlan.priceYearly : item.planYearlyPrice,
              };
            }
            return item;
          })
        );
        setEditingCompany(null);
      } else {
        toast.error("Erro na Atualização", res.error || "Falha ao salvar assinatura.");
      }
    });
  }

  function handleFixDuplicates(slug: string) {
    startTransition(async () => {
      const res = await cancelDuplicateSubscriptionsAction(slug);
      if (res.success) {
        toast.success("Assinatura Regularizada", res.message);
      } else {
        toast.error("Erro", res.error || "Falha ao limpar duplicatas.");
      }
    });
  }

  function handleSyncAllWithStripe() {
    startTransition(async () => {
      const res = await syncAllCompanyPlansWithStripeAction();
      if (res.success) {
        toast.success("Sincronização Concluída", res.message);
      } else {
        toast.error("Erro na Sincronização", res.error || "Falha ao sincronizar com o Stripe.");
      }
    });
  }

  const fmtCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="page-content space-y-8">
      <PageHeader
        category="Plataforma"
        categoryIcon={<DollarSign className="w-3.5 h-3.5" />}
        title="Financeiro"
        description="Receita recorrente, inadimplência e o plano contratado por cada empresa."
        action={
          <button
            type="button"
            onClick={handleSyncAllWithStripe}
            disabled={isPending}
            className="btn btn-outline btn-sm inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>{isPending ? "Sincronizando…" : "Sincronizar com Stripe"}</span>
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MRR", value: fmtCurrency(liveStats.mrr), hint: "receita mensal recorrente" },
          { label: "ARR", value: fmtCurrency(liveStats.arr), hint: "projeção anual (MRR × 12)" },
          {
            label: "Assinaturas ativas",
            value: String(liveStats.activeSubscriptionsCount),
            hint: "empresas em dia",
          },
          {
            label: "Inadimplentes",
            value: String(liveStats.overdueSubscriptionsCount),
            hint: "fatura pendente ou vencida",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card-label">{s.label}</span>
            <span className="stat-card-value">{s.value}</span>
            <span className="stat-card-delta">{s.hint}</span>
          </div>
        ))}
      </div>

      <div className="scroller -mx-1 px-1">
        <div className="segmented w-max" role="tablist" aria-label="Filtrar assinaturas">
          {[
            { id: "ALL", label: "Todas" },
            { id: "ACTIVE", label: "Em dia" },
            { id: "OVERDUE", label: "Inadimplentes" },
            { id: "CANCELED", label: "Canceladas" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === f.id}
              data-active={statusFilter === f.id}
              onClick={() => setStatusFilter(f.id)}
              className="segmented-item whitespace-nowrap"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-[var(--color-text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Empresa ou e-mail do dono"
            aria-label="Buscar empresa"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9"
          />
        </div>
        <span className="toolbar-spacer" />
      </div>

      {/* Tabela de Assinaturas */}
      <div className="bg-[var(--color-bg)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] text-[var(--color-text-subtle)] font-bold uppercase tracking-wider">
              <th className="py-3.5 px-5">Empresa & Dono</th>
              <th className="py-3.5 px-5">Plano Contratado</th>
              <th className="py-3.5 px-5">Valor Mensal</th>
              <th className="py-3.5 px-5">Status</th>
              <th className="py-3.5 px-5 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {paginatedCompanies.map((c) => {
              const isOverdue = c.subscriptionStatus === "past_due" || c.subscriptionStatus === "unpaid";
              const isCanceled = c.subscriptionStatus === "canceled";

              return (
                <tr key={c.id} className="hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--color-bg-muted)] border border-[var(--color-border)] flex items-center justify-center font-bold text-[var(--color-text)]">
                        {c.logoUrl ? (
                          <img src={c.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          c.name[0]?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-[var(--color-text-heading)] text-sm">{c.name}</p>
                        <p className="text-[var(--color-text-muted)] text-[11px]">{c.ownerName} ({c.ownerEmail})</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    <span className="font-semibold text-[var(--color-text-heading)]">{c.planName}</span>
                    <span className="block text-[11px] text-[var(--color-text-subtle)]">
                      Ciclo: {c.subscriptionInterval === "year" ? "Anual" : "Mensal"}
                    </span>
                  </td>

                  <td className="py-4 px-5 font-bold text-[var(--color-text-heading)]">
                    {fmtCurrency(c.planMonthlyPrice)} <span className="text-[10px] text-[var(--color-text-subtle)] font-normal">/mês</span>
                  </td>

                  <td className="py-4 px-5">
                    {isOverdue ? (
                      <StatusBadge variant="danger" tooltip="Assinatura Inadimplente / Fatura Pendente">
                        Inadimplente
                      </StatusBadge>
                    ) : isCanceled ? (
                      <StatusBadge variant="neutral" tooltip="Assinatura Cancelada">
                        Inativo
                      </StatusBadge>
                    ) : (
                      <StatusBadge variant="success" tooltip="Assinatura Ativa / Pagamento Em Dia">
                        Ativo
                      </StatusBadge>
                    )}
                  </td>

                  <td className="py-4 px-5">
                    <RowActions>
                      <IconAction
                        intent="view"
                        icon={<CreditCard />}
                        label={`Ver assinatura e reembolsos de ${c.name}`}
                        onClick={() => setInspectingCompany(c)}
                      />
                      <IconAction
                        intent="settings"
                        label={`Gerenciar plano de ${c.name}`}
                        onClick={() => handleOpenEdit(c)}
                      />
                    </RowActions>
                  </td>
                </tr>
              );
            })}

            {filteredCompanies.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[var(--color-text-subtle)] text-xs">
                  Nenhuma empresa encontrada com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filteredCompanies.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCompanies.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="empresas assinantes"
          />
        )}
      </div>

      {/* Modal de Alteração de Assinatura */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg)] rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-[var(--color-border)]">
            <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
              <h3 className="font-bold text-[var(--color-text-heading)] text-base">Gerenciar Assinatura SaaS</h3>
              <button onClick={() => setEditingCompany(null)} aria-label="Fechar" title="Fechar" className="icon-action"><X className="w-4 h-4" /></button>
            </div>

            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Empresa:</p>
              <p className="font-bold text-[var(--color-text-heading)] text-sm">{editingCompany.name}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Status da Assinatura</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="active">Active (Em Dia / Ativa)</option>
                  <option value="past_due">Past Due (Inadimplente / Pagamento Pendente)</option>
                  <option value="unpaid">Unpaid (Não Pago / Bloqueado)</option>
                  <option value="canceled">Canceled (Assinatura Cancelada)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">Plano da Empresa</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {availablePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} ({fmtCurrency(p.priceMonthly)}/mês)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingCompany(null)}
                className="px-4 py-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSubscription}
                disabled={isPending}
                className="px-4 py-2 bg-[var(--color-navy)] hover:bg-[var(--color-navy-hover)] text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestão Individual & Reembolsos Stripe */}
      {inspectingCompany && (
        <SubscriptionsModal
          companySlug={inspectingCompany.slug}
          companyName={inspectingCompany.name}
          onClose={() => setInspectingCompany(null)}
        />
      )}
    </div>
  );
}
