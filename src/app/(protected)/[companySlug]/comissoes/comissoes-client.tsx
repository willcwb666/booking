"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import type { CommissionReport, ProfessionalCommissionSummary } from "@/server/queries/commissions";
import { updateProfessionalCommissionAction } from "@/server/actions/commissions";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/lib/toast-service";
import { DollarSign, Award, Users, Download, Settings, Calendar, TrendingUp, Filter } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

type Props = {
  companySlug: string;
  report: CommissionReport;
  from: string;
  to: string;
};

export function ComissoesClient({ companySlug, report, from, to }: Props) {
  const company = useCompany();
  const router = useRouter();

  const [dateFrom, setDateFrom] = useState(from);
  const [dateTo, setDateTo] = useState(to);

  // Multi-select de profissionais com checkbox
  const [selectedProfIds, setSelectedProfIds] = useState<string[]>([]);
  const [showProfFilter, setShowProfFilter] = useState(false);
  const [profSearch, setProfSearch] = useState("");

  // Paginação da tabela de profissionais
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Paginação do modal de extrato
  const [extratoPage, setExtratoPage] = useState(1);
  const [extratoPageSize, setExtratoPageSize] = useState(10);

  // Edit commission modal state
  const [editingProf, setEditingProf] = useState<ProfessionalCommissionSummary | null>(null);
  const [newPercentage, setNewPercentage] = useState<number>(0);
  const [newProductPercentage, setNewProductPercentage] = useState<number>(0);
  const [selectedProfDetails, setSelectedProfDetails] = useState<ProfessionalCommissionSummary | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/${companySlug}/comissoes?from=${dateFrom}&to=${dateTo}`);
  };

  // Toggle profissional individual
  const toggleProf = (id: string) => {
    setCurrentPage(1);
    setSelectedProfIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Selecionar todos os profissionais
  const handleSelectAll = () => {
    setCurrentPage(1);
    setSelectedProfIds(report.professionals.map((p) => p.id));
  };

  // Limpar seleção
  const handleClearSelection = () => {
    setCurrentPage(1);
    setSelectedProfIds([]);
  };

  // Profissionais filtrados por seleção de checkboxes
  const filteredProfessionals = report.professionals.filter((p) => {
    if (selectedProfIds.length > 0 && !selectedProfIds.includes(p.id)) {
      return false;
    }
    return true;
  });

  // Métricas calculadas para os profissionais filtrados
  const displayGrossRevenue = filteredProfessionals.reduce(
    (acc, p) => acc + p.totalRevenueGenerated,
    0
  );
  const displayCommissionsOwed = filteredProfessionals.reduce(
    (acc, p) => acc + p.totalCommissionAmount,
    0
  );
  const displayNetCompany = filteredProfessionals.reduce(
    (acc, p) => acc + p.companyRetainedAmount,
    0
  );
  const displayCompletedCount = filteredProfessionals.reduce(
    (acc, p) => acc + p.completedBookingsCount,
    0
  );

  // Fatiamento de paginação dos profissionais
  const paginatedProfessionals = filteredProfessionals.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const setQuickRange = (preset: "this_month" | "last_month" | "last_30_days") => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let f = "";
    let t = "";

    if (preset === "this_month") {
      f = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      t = new Date(year, month + 1, 0).toISOString().split("T")[0];
    } else if (preset === "last_month") {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      f = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
      t = new Date(prevYear, prevMonth + 1, 0).toISOString().split("T")[0];
    } else if (preset === "last_30_days") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      f = d.toISOString().split("T")[0];
      t = now.toISOString().split("T")[0];
    }

    setDateFrom(f);
    setDateTo(t);
    router.push(`/${companySlug}/comissoes?from=${f}&to=${t}`);
  };

  const handleSaveCommission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProf) return;

    startTransition(async () => {
      const res = await updateProfessionalCommissionAction(
        companySlug,
        editingProf.id,
        newPercentage,
        newProductPercentage
      );

      if (res.success) {
        toast.success(
          "Atualizado",
          `${editingProf.name}: ${newPercentage}% em serviços, ${newProductPercentage}% em produtos.`
        );
        setEditingProf(null);
        router.refresh();
      } else {
        toast.error("Erro", res.errors?._?.[0] ?? "Falha ao atualizar comissão.");
      }
    });
  };

  const exportCommissionCSV = () => {
    if (filteredProfessionals.length === 0) {
      toast.error("Sem dados", "Nenhum profissional com dados para exportar.");
      return;
    }

    const headers = [
      "Profissional",
      "Email",
      "Taxa Servico (%)",
      "Taxa Produto (%)",
      "Atendimentos Concluidos",
      "Vendas no Balcao",
      "Faturamento Servico",
      "Comissao Servico",
      "Faturamento Produto",
      "Comissao Produto",
      "Faturamento Bruto",
      "Valor da Comissao",
      "Retencao Empresa",
      "Periodo Inicial",
      "Periodo Final",
    ];

    const rows = filteredProfessionals.map((p) => [
      `"${p.name}"`,
      `"${p.email || ""}"`,
      p.serviceRate,
      p.productRate,
      p.completedBookingsCount,
      p.posSalesCount,
      p.service.revenue.toFixed(2),
      p.service.commission.toFixed(2),
      p.product.revenue.toFixed(2),
      p.product.commission.toFixed(2),
      p.totalRevenueGenerated.toFixed(2),
      p.totalCommissionAmount.toFixed(2),
      p.companyRetainedAmount.toFixed(2),
      dateFrom,
      dateTo,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `comissoes_${companySlug}_${dateFrom}_a_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exportado!", "Relatório de comissões baixado.");
  };

  return (
    <div className="page-content space-y-6">
      <PageHeader
        title="Fechamento & Comissões da Equipe"
        description="Acompanhe o faturamento gerado por cada profissional, calcule o rateio automático de comissões e realize o fechamento do período."
        action={
          <button
            type="button"
            onClick={exportCommissionCSV}
            className="btn btn-outline btn-sm inline-flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Fechamento (CSV)</span>
          </button>
        }
      />

      {/* Filtro de Período e Profissionais */}
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-5 shadow-xs space-y-4">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-text-subtle)]" />
              <span className="text-xs font-bold text-[var(--color-text)]">Período:</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input !w-auto !py-1 !px-2.5 text-xs" />
              <span className="text-[var(--color-text-subtle)] text-xs">até</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input !w-auto !py-1 !px-2.5 text-xs" />
            </div>
            <button type="submit" className="btn btn-primary btn-sm !text-xs">Aplicar</button>
            <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--color-border)]">
              <button type="button" onClick={() => setQuickRange("this_month")} className="btn btn-secondary btn-sm !text-xs">Este Mês</button>
              <button type="button" onClick={() => setQuickRange("last_month")} className="btn btn-outline btn-sm !text-xs">Mês Passado</button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowProfFilter(!showProfFilter)}
            className={`px-3.5 py-2 rounded-[var(--radius-control)] text-xs font-bold border transition-all inline-flex items-center gap-2 ${selectedProfIds.length > 0 ? "bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary)]" : "bg-[var(--color-bg-subtle)] border-[var(--color-border)] text-[var(--color-text)]"}`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{selectedProfIds.length === 0 ? "Filtrar Profissionais" : `${selectedProfIds.length} selecionado(s)`}</span>
          </button>
        </form>

        {showProfFilter && (
          <div className="p-4 bg-[var(--color-bg-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
              <span className="text-xs font-semibold text-[var(--color-text)]">Selecione Profissionais:</span>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={handleSelectAll} className="text-[var(--color-primary)] font-bold hover:underline">Selecionar Todos</button>
                <button type="button" onClick={handleClearSelection} className="text-[var(--color-text-muted)] font-medium hover:underline">Limpar</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {report.professionals.map((prof) => (
                <label key={prof.id} className="flex items-center gap-2 p-2 rounded-[var(--radius-control)] bg-[var(--color-bg)] border border-[var(--color-border)] text-xs cursor-pointer">
                  <input type="checkbox" checked={selectedProfIds.includes(prof.id)} onChange={() => toggleProf(prof.id)} />
                  {prof.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Faturamento Bruto" value={formatMoney(displayGrossRevenue, company.currency, company.locale)} description={`${displayCompletedCount} atendimentos`} icon={<DollarSign className="w-4 h-4" />} variant="primary" />
        <MetricCard title="Total em Comissões" value={formatMoney(displayCommissionsOwed, company.currency, company.locale)} description="A pagar" icon={<Award className="w-4 h-4" />} variant="warning" />
        <MetricCard title="Receita Líquida" value={formatMoney(displayNetCompany, company.currency, company.locale)} description="Margem empresa" icon={<TrendingUp className="w-4 h-4" />} variant="success" />
        <MetricCard title="Profissionais" value={filteredProfessionals.length} description="Ativos no período" icon={<Users className="w-4 h-4" />} variant="default" />
      </div>

      {/* Tabela de Comissões */}
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-5 space-y-4 shadow-xs">
        <h2 className="text-sm font-semibold text-[var(--color-text-heading)]">Detalhamento por Profissional</h2>

        {report.unsplitPosCommission > 0 && (
          /* Vendas de balcão anteriores à separação por item guardam só o total.
             Aparece à parte porque atribuí-las a serviço ou a produto seria
             inventar um rateio que ninguém registrou na época. */
          <p
            className="text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2"
            style={{ fontSize: "var(--text-2xs)" }}
          >
            {formatMoney(report.unsplitPosCommission, company.currency, company.locale)} de
            comissão de balcão neste período é anterior à separação por item e não
            aparece dividida entre serviço e produto — o valor está correto no total,
            só não tem como saber a origem.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-bold border-b border-[var(--color-border)]">
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3 text-center">Serviço</th>
                <th className="px-4 py-3 text-center">Produto</th>
                <th className="px-4 py-3 text-right">Comissão serviço</th>
                <th className="px-4 py-3 text-right">Comissão produto</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] font-medium">
              {paginatedProfessionals.map((prof) => (
                <tr key={prof.id}>
                  <td className="px-4 py-3.5 font-semibold">{prof.name}</td>
                  <td className="px-4 py-3.5 text-center">{prof.serviceRate}%</td>
                  <td className="px-4 py-3.5 text-center">
                    {prof.productRate > 0 ? (
                      `${prof.productRate}%`
                    ) : (
                      /* Zero e ausencia sao coisas diferentes aqui: sem taxa de
                         produto configurada, vender no balcao nao paga nada. */
                      <span className="text-[var(--color-text-subtle)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">{formatMoney(prof.service.commission, company.currency, company.locale)}</td>
                  <td className="px-4 py-3.5 text-right">{formatMoney(prof.product.commission, company.currency, company.locale)}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-[var(--color-text-heading)]">{formatMoney(prof.totalCommissionAmount, company.currency, company.locale)}</td>
                  <td className="px-4 py-3.5 text-right space-x-2">
                    <button type="button" onClick={() => { setEditingProf(prof); setNewPercentage(prof.serviceRate); setNewProductPercentage(prof.productRate); }} className="p-1.5 bg-[var(--color-bg-muted)] rounded-[var(--radius-control)]"><Settings className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { setSelectedProfDetails(prof); setExtratoPage(1); }} className="px-2.5 py-1 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-[var(--radius-control)] font-bold">Extrato</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProfessionals.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredProfessionals.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="profissionais"
          />
        )}
      </div>

      {/* Modal para Editar Porcentagem de Comissão */}
      {editingProf && (
        <Modal
          title={`Ajustar Comissão — ${editingProf.name}`}
          isOpen={true}
          onClose={() => setEditingProf(null)}
        >
          <form onSubmit={handleSaveCommission} className="space-y-4">
            <p className="text-xs text-[var(--color-text-muted)]">
              Serviço e produto têm taxas separadas. É o que permite fechar a
              quinzena sem separar na planilha.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="commissionInput" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Serviços (%)
                </label>
                <div className="relative">
                  <input
                    id="commissionInput"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={newPercentage}
                    onChange={(e) => setNewPercentage(parseFloat(e.target.value) || 0)}
                    className="input !pr-10"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-subtle)]">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="productCommissionInput" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Produtos (%)
                </label>
                <div className="relative">
                  <input
                    id="productCommissionInput"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={newProductPercentage}
                    onChange={(e) => setNewProductPercentage(parseFloat(e.target.value) || 0)}
                    className="input !pr-10"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-text-subtle)]">
                    %
                  </span>
                </div>
                <p className="text-[var(--color-text-subtle)] mt-1" style={{ fontSize: "var(--text-2xs)" }}>
                  Zero significa que vender no balcão não paga comissão.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProf(null)}
                className="btn btn-outline btn-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary btn-sm"
              >
                {isPending ? "Salvando..." : "Salvar Alteração"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Extrato do Profissional */}
      {selectedProfDetails && (
        <Modal
          title={`Extrato de Atendimentos — ${selectedProfDetails.name}`}
          isOpen={true}
          onClose={() => setSelectedProfDetails(null)}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-control)] border border-[var(--color-border)] text-xs">
              <div>
                <span className="text-[var(--color-text-subtle)] block">Total de Atendimentos:</span>
                <span className="font-bold text-[var(--color-text-heading)]">{selectedProfDetails.completedBookingsCount}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-subtle)] block">Comissão ({selectedProfDetails.serviceRate}% serviço{selectedProfDetails.productRate > 0 ? ` · ${selectedProfDetails.productRate}% produto` : ""}):</span>
                <span className="font-bold text-[var(--color-warning)]">
                  {formatMoney(selectedProfDetails.totalCommissionAmount, company.currency, company.locale)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[var(--color-text)]">Atendimentos Concluídos no Período</h3>
                <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)]">
                  {selectedProfDetails.recentBookings.length} registro(s)
                </span>
              </div>

              {selectedProfDetails.recentBookings.length === 0 ? (
                <p className="text-xs text-[var(--color-text-subtle)] py-4 text-center">Nenhum atendimento no período selecionado.</p>
              ) : (
                <div className="border border-[var(--color-border)] rounded-[var(--radius-control)] overflow-hidden shadow-2xs">
                  <div className="divide-y divide-[var(--color-border)]">
                    {selectedProfDetails.recentBookings
                      .slice((extratoPage - 1) * extratoPageSize, extratoPage * extratoPageSize)
                      .map((b) => (
                        <div key={b.id} className="p-3 flex items-center justify-between text-xs hover:bg-[var(--color-bg-subtle)] transition-colors">
                          <div>
                            <p className="font-bold text-[var(--color-text-heading)]">{b.serviceName}</p>
                            <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)]">
                              {b.customerName} · {b.scheduledDate.split("-").reverse().join("/")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[var(--color-text-heading)]">
                              {formatMoney(b.total, company.currency, company.locale)}
                            </p>
                            <p className="text-[var(--text-2xs)] font-bold text-[var(--color-warning)]">
                              +{formatMoney(b.commission, company.currency, company.locale)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Paginação do Extrato */}
                  {selectedProfDetails.recentBookings.length > 0 && (
                    <Pagination
                      currentPage={extratoPage}
                      totalItems={selectedProfDetails.recentBookings.length}
                      pageSize={extratoPageSize}
                      pageSizeOptions={[10, 20, 30, 50, 100]}
                      onPageChange={setExtratoPage}
                      onPageSizeChange={setExtratoPageSize}
                      itemLabel="atendimentos"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedProfDetails) return;
                    const periodText = `${dateFrom ? dateFrom.split("-").reverse().join("/") : ""} até ${dateTo ? dateTo.split("-").reverse().join("/") : ""}`;
                    const totalComm = formatMoney(selectedProfDetails.totalCommissionAmount, company.currency, company.locale);
                    const totalRev = formatMoney(selectedProfDetails.totalRevenueGenerated, company.currency, company.locale);
                    const text = `Olá, *${selectedProfDetails.name}*! 💈✂️\n\nSegue o fechamento das suas comissões de atendimentos na *${company.name}*:\n\n📅 *Período:* ${periodText}\n⭐ *Atendimentos Concluídos:* ${selectedProfDetails.completedBookingsCount}\n💼 *Faturamento Gerado:* ${totalRev}\n💼 *Comissão de serviços:* ${formatMoney(selectedProfDetails.service.commission, company.currency, company.locale)}
📦 *Comissão de produtos:* ${formatMoney(selectedProfDetails.product.commission, company.currency, company.locale)}
💰 *Total a Receber:* ${totalComm}\n\nExtrato gerado via sistema.`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="px-3 py-1.5 rounded-[var(--radius-control)] bg-[var(--color-success-light)] hover:bg-[var(--color-success-light)] text-[var(--color-success)] font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📲 Enviar no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-[var(--radius-control)] bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️ Imprimir Holerite / Extrato</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProfDetails(null)}
                className="btn btn-secondary btn-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
