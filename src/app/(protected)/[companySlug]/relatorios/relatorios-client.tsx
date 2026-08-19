"use client";

import React from "react";
import { FileText, DollarSign, CheckCircle2, TrendingUp, Scissors, Users } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  reports: any;
};

export function CompanyRelatoriosClient({ companySlug, reports }: Props) {
  if (!reports) return null;

  const fmtCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="w-full px-6 sm:px-10 py-8 text-left space-y-8">
      <div>
        <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
          <FileText className="w-4 h-4" />
          <span>Relatórios & DRE Operacional</span>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-heading)] tracking-tight mt-1">
          Desempenho Comercial & DRE
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Relatórios detalhados de faturamento por serviço, receita total acumulada e conversão de agendamentos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-5 shadow-2xs">
          <span className="text-[var(--text-2xs)] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider block mb-1">Faturamento Realizado</span>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{fmtCurrency(reports.totalRevenue)}</p>
          <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1">Acumulado de serviços concluídos</p>
        </div>

        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-5 shadow-2xs">
          <span className="text-[var(--text-2xs)] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider block mb-1">Total de Agendamentos</span>
          <p className="text-2xl font-semibold text-[var(--color-text-heading)]">{reports.totalBookings}</p>
          <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1">{reports.completedCount} concluídos | {reports.cancelledCount} cancelados</p>
        </div>

        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-5 shadow-2xs">
          <span className="text-[var(--text-2xs)] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider block mb-1">Taxa de Conclusão</span>
          <p className="text-2xl font-semibold text-[var(--color-primary)]">{reports.conversionRate.toFixed(1)}%</p>
          <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1">Efetividade de atendimento</p>
        </div>

        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-5 shadow-2xs">
          <span className="text-[var(--text-2xs)] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider block mb-1">Serviços Pendentes</span>
          <p className="text-2xl font-semibold text-[var(--color-warning)]">{reports.pendingCount}</p>
          <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1">Aguardando atendimento</p>
        </div>
      </div>

      {/* Tabela de Serviços mais Rentáveis */}
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-base font-semibold text-[var(--color-text-heading)]">Ranking dos Serviços Mais Rentáveis</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-bold border-b border-[var(--color-border)]">
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3 text-center">Atendimentos Concluídos</th>
                <th className="px-4 py-3 text-right">Faturamento Gerado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] font-medium">
              {reports.topServices.map((s: any, idx: number) => (
                <tr key={idx} className="hover:bg-[var(--color-bg-subtle)]">
                  <td className="px-4 py-3 font-bold text-[var(--color-text-heading)]">{s.name}</td>
                  <td className="px-4 py-3 text-center text-[var(--color-text)] font-bold">{s.count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--color-success)]">{fmtCurrency(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
