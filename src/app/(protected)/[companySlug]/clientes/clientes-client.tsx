"use client";

import React, { useState, useTransition } from "react";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import type { CustomerSummary } from "@/server/queries/customers";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { MetricCard } from "@/components/ui/metric-card";
import { toast } from "@/lib/toast-service";
import { Download } from "lucide-react";
import { Users, Mail, Phone, MapPin, Calendar, DollarSign, Award, Clock, Sparkles, MessageSquare, Copy, Check, Shield } from "@/components/ui/icons";
import { generateAIRetentionCampaignAction } from "@/server/actions/ai-copilot";
import { Pagination } from "@/components/ui/pagination";

type Props = {
  companySlug: string;
  customers: CustomerSummary[];
};

export function ClientesClient({ companySlug, customers: initialCustomers }: Props) {
  const company = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [aiCampaign, setAiCampaign] = useState<{ whatsappCopy: string; emailSubject: string; emailBody: string } | null>(null);
  const [isGeneratingCampaign, startGenerating] = useTransition();
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const filteredCustomers = initialCustomers.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(term) ||
      c.lastName.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      (c.city && c.city.toLowerCase().includes(term))
    );
  });

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalSpentAll = initialCustomers.reduce((acc, c) => acc + c.totalSpent, 0);
  const avgSpent = initialCustomers.length > 0 ? totalSpentAll / initialCustomers.length : 0;

  const exportToCSV = () => {
    if (initialCustomers.length === 0) {
      toast.error("Sem dados", "Nenhum cliente para exportar.");
      return;
    }
    const headers = [
      "Nome",
      "Sobrenome",
      "Email",
      "Telefone",
      "Cidade",
      "Total Agendamentos",
      "Concluidos",
      "Faltas",
      "LTV Gasto",
      "Ultimo Agendamento",
    ];
    const rows = initialCustomers.map((c) => [
      `"${c.firstName}"`,
      `"${c.lastName}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      `"${c.city || ""}"`,
      c.totalBookings,
      c.completedBookings,
      c.noShowCount || 0,
      c.totalSpent.toFixed(2),
      `"${c.lastBookingDate || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clientes_${companySlug}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exportado!", "Arquivo CSV baixado com sucesso.");
  };

  const handleGenerateCampaign = (customer: CustomerSummary) => {
    setAiCampaign(null);
    startGenerating(async () => {
      const res = await generateAIRetentionCampaignAction(
        `${customer.firstName} ${customer.lastName}`,
        45 // Dias inativos simulados
      );
      if (res.success && res.data) {
        setAiCampaign(res.data);
      }
    });
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="page-content space-y-6">
      <PageHeader
        title="CRM & Gestão de Clientes"
        description="Histórico completo de clientes, LTV (Lifetime Value), frequência de visitas e exportação rápida."
        action={
          <button
            type="button"
            onClick={exportToCSV}
            className="btn btn-outline btn-sm inline-flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        }
      />

      {/* KPI Cards Rápidos do CRM */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total de Clientes"
          value={initialCustomers.length}
          description="Clientes com histórico na base"
          icon={<Users className="w-4 h-4" />}
          variant="primary"
        />

        <MetricCard
          title="Receita Total (LTV)"
          value={formatMoney(totalSpentAll, company.currency, company.locale)}
          description="Volume acumulado de vendas"
          icon={<DollarSign className="w-4 h-4" />}
          variant="success"
        />

        <MetricCard
          title="Ticket Médio"
          value={formatMoney(avgSpent, company.currency, company.locale)}
          description="Média gasta por cliente"
          icon={<Award className="w-4 h-4" />}
          variant="default"
        />
      </div>

      {/* Tabela Principal */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, e-mail, telefone ou cidade..."
          />

          <span className="text-xs text-slate-500 font-medium">
            Exibindo: {filteredCustomers.length} cliente(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contato & Cidade</th>
                <th className="px-4 py-3 text-center">Agendamentos</th>
                <th className="px-4 py-3 text-right">Total Gasto (LTV)</th>
                <th className="px-4 py-3 text-center">Risco No-Show IA</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Users className="w-6 h-6" />}
                      title="Nenhum cliente encontrado"
                      description="Não encontramos nenhum cliente cadastrado ou correspondente à busca."
                    />
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c, idx) => {
                  const noShowRisk = c.cancelledBookings > 1 ? "HIGH" : "LOW";
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-extrabold shrink-0 border border-slate-200">
                            {c.firstName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">
                              {c.firstName} {c.lastName}
                            </p>
                            {c.totalSpent > 500 && (
                              <StatusBadge variant="primary" size="sm" className="mt-1">
                                Cliente VIP
                              </StatusBadge>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.phone}
                          </span>
                          {c.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {c.city}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {c.totalBookings}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          ({c.completedBookings} concluídos)
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 text-sm">
                        {formatMoney(c.totalSpent, company.currency, company.locale)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {noShowRisk === "HIGH" ? (
                          <StatusBadge variant="danger" tooltip="Risco Alto de No-Show — Sugerido Sinal">
                            Alto Risco
                          </StatusBadge>
                        ) : (
                          <StatusBadge variant="success" tooltip="Risco Baixo de No-Show">
                            Baixo Risco
                          </StatusBadge>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <ActionTooltip label="Ver Ficha & IA de Retenção">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setAiCampaign(null);
                            }}
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                        </ActionTooltip>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCustomers.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="clientes"
          />
        )}
      </div>

      {/* Modal de Detalhes do Cliente com IA */}
      {selectedCustomer && (
        <Modal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={`Ficha do Cliente — ${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Contatos e Localização
                </span>
                <p className="text-xs text-slate-700 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCustomer.email}</span>
                </p>
                <p className="text-xs text-slate-700 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCustomer.phone}</span>
                </p>
                <p className="text-xs text-slate-700 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCustomer.city || "Cidade não informada"}</span>
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Métricas de Consumo & No-Show IA
                </span>
                <p className="text-xs text-slate-700 flex items-center justify-between">
                  <span>Total Gasto:</span>
                  <strong className="text-emerald-700 font-extrabold">
                    {formatMoney(selectedCustomer.totalSpent, company.currency, company.locale)}
                  </strong>
                </p>
                <p className="text-xs text-slate-700 flex items-center justify-between">
                  <span>Total Agendamentos:</span>
                  <strong>{selectedCustomer.totalBookings}</strong>
                </p>
                <p className="text-xs text-slate-700 flex items-center justify-between">
                  <span>Concluídos / Cancelados:</span>
                  <span>
                    <strong className="text-emerald-600">{selectedCustomer.completedBookings}</strong> /{" "}
                    <strong className="text-red-600">{selectedCustomer.cancelledBookings}</strong>
                  </span>
                </p>
              </div>
            </div>

            {/* SEÇÃO IA: GERADOR DE CAMPANHA DE RETENÇÃO */}
            <div className="bg-[var(--color-bg-subtle)] p-5 rounded-2xl text-[var(--color-text)] space-y-4 border border-[var(--color-border)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>IA de Retenção & Reativação</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateCampaign(selectedCustomer)}
                  disabled={isGeneratingCampaign}
                  className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingCampaign ? "Gerando com IA..." : "Gerar Oferta com IA"}</span>
                </button>
              </div>

              {aiCampaign && (
                <div className="space-y-3 animate-in fade-in">
                  {/* WhatsApp Copy */}
                  <div className="bg-white p-3.5 rounded-xl border border-[var(--color-border)] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-emerald-600" /> Mensagem para WhatsApp
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(aiCampaign.whatsappCopy, "wa")}
                        className="text-[10px] bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-muted)] border border-[var(--color-border)] px-2.5 py-1 rounded-lg text-[var(--color-text-heading)] font-bold inline-flex items-center gap-1 transition-all"
                      >
                        {copiedText === "wa" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedText === "wa" ? "Copiado!" : "Copiar"}</span>
                      </button>
                    </div>
                    <pre className="text-xs text-[var(--color-text)] font-sans whitespace-pre-wrap leading-relaxed">
                      {aiCampaign.whatsappCopy}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
