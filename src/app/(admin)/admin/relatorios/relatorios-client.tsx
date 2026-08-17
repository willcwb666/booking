"use client";

import React from "react";
import Link from "next/link";
import { FileText, DollarSign, TrendingUp, Building2, CheckCircle2 } from "@/components/ui/icons";

type Props = {
  reports: any;
};

export function AdminRelatoriosClient({ reports }: Props) {
  if (!reports) return null;

  const fmtCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="page-content space-y-8">
      <div>
        <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
          <FileText className="w-4 h-4" />
          <span>Relatórios de Gestão Plataforma</span>
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--color-text-heading)] tracking-tight mt-1">
          Relatórios & Performance Global do SaaS
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Consolidado financeiro de MRR, ARR, distribuição por plano e empresas com maior volume.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-[var(--color-border)]/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider block mb-1">MRR Total</span>
          <p className="text-2xl font-black text-emerald-600">{fmtCurrency(reports.mrr)}</p>
          <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">Faturamento recorrente mensal</p>
        </div>

        <div className="bg-white rounded-3xl border border-[var(--color-border)]/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider block mb-1">ARR Projetado</span>
          <p className="text-2xl font-black text-blue-600">{fmtCurrency(reports.arr)}</p>
          <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">Projeção anual acumulada</p>
        </div>

        <div className="bg-white rounded-3xl border border-[var(--color-border)]/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider block mb-1">Empresas Adimplentes</span>
          <p className="text-2xl font-black text-[var(--color-text-heading)]">{reports.activeCompanies}</p>
          <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">de {reports.totalCompaniesCount} cadastradas</p>
        </div>

        <div className="bg-white rounded-3xl border border-[var(--color-border)]/80 p-5 shadow-2xs">
          <span className="text-[11px] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider block mb-1">Inadimplência</span>
          <p className="text-2xl font-black text-amber-600">{reports.overdueCompanies}</p>
          <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">Pagamentos pendentes no Stripe</p>
        </div>
      </div>

      {/* Tabela de Top Empresas por Volume de Reservas */}
      <div className="bg-white rounded-3xl border border-[var(--color-border)]/80 p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-base font-extrabold text-[var(--color-text-heading)]">Ranking das Top 10 Empresas por Volume de Atendimentos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-bold border-b border-[var(--color-border)]/80">
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Plano Contratado</th>
                <th className="px-4 py-3 text-center">Total de Agendamentos</th>
                <th className="px-4 py-3 text-center">Membros</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] font-medium">
              {reports.topCompaniesByVolume.map((c: any) => (
                <tr key={c.id} className="hover:bg-[var(--color-bg-subtle)]/60">
                  <td className="px-4 py-3 font-bold text-[var(--color-text-heading)]">{c.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{c.planName}</td>
                  <td className="px-4 py-3 text-center font-bold text-[var(--color-primary)]">{c.bookingCount}</td>
                  <td className="px-4 py-3 text-center text-[var(--color-text)]">{c.memberCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/companies?q=${c.slug}`} className="text-[var(--color-primary)] font-bold hover:underline">
                      Detalhes ➔
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
