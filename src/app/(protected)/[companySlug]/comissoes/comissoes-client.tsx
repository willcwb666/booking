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
        newPercentage
      );

      if (res.success) {
        toast.success("Atualizado!", `Comissão de ${editingProf.name} alterada para ${newPercentage}%.`);
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
      "Comissao (%)",
      "Atendimentos Concluidos",
      "Faturamento Bruto",
      "Valor da Comissao",
      "Retencao Empresa",
      "Periodo Inicial",
      "Periodo Final",
    ];

    const rows = filteredProfessionals.map((p) => [
      `"${p.name}"`,
      `"${p.email || ""}"`,
      p.commissionPercentage,
      p.completedBookingsCount,
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">Período:</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input !w-auto !py-1 !px-2.5 text-xs" />
              <span className="text-slate-400 text-xs">até</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input !w-auto !py-1 !px-2.5 text-xs" />
            </div>
            <button type="submit" className="btn btn-primary btn-sm !text-xs">Aplicar</button>
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <button type="button" onClick={() => setQuickRange("this_month")} className="btn btn-secondary btn-sm !text-xs">Este Mês</button>
              <button type="button" onClick={() => setQuickRange("last_month")} className="btn btn-outline btn-sm !text-xs">Mês Passado</button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowProfFilter(!showProfFilter)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-2 ${selectedProfIds.length > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-700"}`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{selectedProfIds.length === 0 ? "Filtrar Profissionais" : `${selectedProfIds.length} selecionado(s)`}</span>
          </button>
        </form>

        {showProfFilter && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-xs font-extrabold text-slate-800">Selecione Profissionais:</span>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={handleSelectAll} className="text-indigo-600 font-bold hover:underline">Selecionar Todos</button>
                <button type="button" onClick={handleClearSelection} className="text-slate-500 font-medium hover:underline">Limpar</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {report.professionals.map((prof) => (
                <label key={prof.id} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-xs cursor-pointer">
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
        <h2 className="text-sm font-extrabold text-slate-900">Detalhamento por Profissional</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                <th className="px-4 py-3">Profissional</th>
                <th className="px-4 py-3 text-center">Comissão (%)</th>
                <th className="px-4 py-3 text-center">Atendimentos</th>
                <th className="px-4 py-3 text-right">Faturamento</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedProfessionals.map((prof) => (
                <tr key={prof.id}>
                  <td className="px-4 py-3.5 font-extrabold">{prof.name}</td>
                  <td className="px-4 py-3.5 text-center">{prof.commissionPercentage}%</td>
                  <td className="px-4 py-3.5 text-center">{prof.completedBookingsCount}</td>
                  <td className="px-4 py-3.5 text-right">{formatMoney(prof.totalRevenueGenerated, company.currency, company.locale)}</td>
                  <td className="px-4 py-3.5 text-right space-x-2">
                    <button type="button" onClick={() => { setEditingProf(prof); setNewPercentage(prof.commissionPercentage); }} className="p-1.5 bg-slate-100 rounded-lg"><Settings className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => { setSelectedProfDetails(prof); setExtratoPage(1); }} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold">Extrato</button>
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
            <p className="text-xs text-slate-500">
              Defina a porcentagem que este profissional recebe sobre os serviços que ele realiza.
            </p>

            <div>
              <label htmlFor="commissionInput" className="block text-xs font-bold text-slate-700 mb-1">
                Porcentagem de Comissão (%)
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
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
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block">Total de Atendimentos:</span>
                <span className="font-bold text-slate-900">{selectedProfDetails.completedBookingsCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Comissão ({selectedProfDetails.commissionPercentage}%):</span>
                <span className="font-bold text-amber-600">
                  {formatMoney(selectedProfDetails.totalCommissionAmount, company.currency, company.locale)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700">Atendimentos Concluídos no Período</h3>
                <span className="text-[11px] text-slate-400">
                  {selectedProfDetails.recentBookings.length} registro(s)
                </span>
              </div>

              {selectedProfDetails.recentBookings.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum atendimento no período selecionado.</p>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                  <div className="divide-y divide-slate-100">
                    {selectedProfDetails.recentBookings
                      .slice((extratoPage - 1) * extratoPageSize, extratoPage * extratoPageSize)
                      .map((b) => (
                        <div key={b.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/60 transition-colors">
                          <div>
                            <p className="font-bold text-slate-900">{b.serviceName}</p>
                            <p className="text-[11px] text-slate-400">
                              {b.customerName} · {b.scheduledDate.split("-").reverse().join("/")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">
                              {formatMoney(b.total, company.currency, company.locale)}
                            </p>
                            <p className="text-[11px] font-bold text-amber-600">
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

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedProfDetails) return;
                    const periodText = `${dateFrom ? dateFrom.split("-").reverse().join("/") : ""} até ${dateTo ? dateTo.split("-").reverse().join("/") : ""}`;
                    const totalComm = formatMoney(selectedProfDetails.totalCommissionAmount, company.currency, company.locale);
                    const totalRev = formatMoney(selectedProfDetails.totalRevenueGenerated, company.currency, company.locale);
                    const text = `Olá, *${selectedProfDetails.name}*! 💈✂️\n\nSegue o fechamento das suas comissões de atendimentos na *${company.name}*:\n\n📅 *Período:* ${periodText}\n⭐ *Atendimentos Concluídos:* ${selectedProfDetails.completedBookingsCount}\n💼 *Faturamento Gerado:* ${totalRev}\n💰 *Comissão a Receber (${selectedProfDetails.commissionPercentage}%):* ${totalComm}\n\nExtrato gerado via sistema.`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📲 Enviar no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
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
