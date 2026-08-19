"use client";

import React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IconAction, RowActions } from "@/components/ui/icon-action";
import { BreakdownBars } from "@/components/charts/breakdown-bars";
import { Building2, FileText } from "@/components/ui/icons";

/** Espelha o retorno de `getSuperAdminReportsAction`. Antes era `any`. */
type Reports = {
  mrr: number;
  arr: number;
  totalCompaniesCount: number;
  activeCompanies: number;
  overdueCompanies: number;
  planDistribution: { name: string; count: number }[];
  topCompaniesByVolume: {
    id: string;
    name: string;
    slug: string;
    planName: string;
    bookingCount: number;
    memberCount: number;
  }[];
};

export function AdminRelatoriosClient({ reports }: { reports: Reports }) {
  const money = (val: number) =>
    val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

  const stats = [
    { label: "MRR", value: money(reports.mrr), hint: "Receita recorrente mensal" },
    { label: "ARR", value: money(reports.arr), hint: "Projeção anual (MRR × 12)" },
    {
      label: "Assinaturas em dia",
      value: String(reports.activeCompanies),
      hint: `de ${reports.totalCompaniesCount} empresas cadastradas`,
    },
    {
      label: "Em atraso",
      value: String(reports.overdueCompanies),
      hint: "Status past_due ou unpaid",
    },
  ];

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Plataforma"
        categoryIcon={<FileText className="w-3.5 h-3.5" />}
        title="Relatórios"
        description="Consolidado de receita recorrente, distribuição por plano e empresas com maior volume."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card-label">{s.label}</span>
            <span className="stat-card-value">{s.value}</span>
            <span className="stat-card-delta">{s.hint}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* A distribuição por plano já vinha calculada da action e a tela
            simplesmente não a mostrava. */}
        <article className="lg:col-span-5 card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Empresas por plano
            </h2>
          </div>
          <div className="card-body">
            <BreakdownBars
              items={reports.planDistribution.map((p) => ({
                label: p.name,
                value: p.count,
              }))}
              categorical
              format={(v) => String(v)}
              emptyLabel="Nenhuma assinatura ativa"
            />
          </div>
        </article>

        <article className="lg:col-span-7 card overflow-hidden">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Maior volume de atendimentos
            </h2>
            <span className="eyebrow">top 10</span>
          </div>

          {reports.topCompaniesByVolume.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-5 h-5" />}
              title="Nenhum atendimento registrado"
              description="O ranking aparece assim que as empresas começarem a receber agendamentos."
            />
          ) : (
            <div
              className="table-container"
              style={{ border: 0, borderRadius: 0, boxShadow: "none" }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Empresa</th>
                    <th scope="col">Plano</th>
                    <th scope="col" className="text-right">
                      Agendamentos
                    </th>
                    <th scope="col" className="text-right">
                      Membros
                    </th>
                    <th scope="col" className="text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.topCompaniesByVolume.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium text-[var(--color-text-heading)]">
                        {c.name}
                      </td>
                      <td className="text-[var(--color-text-muted)]">{c.planName}</td>
                      <td data-type="number">{c.bookingCount}</td>
                      <td data-type="number">{c.memberCount}</td>
                      <td>
                        <RowActions>
                          <IconAction
                            intent="view"
                            label={`Ver ${c.name} na lista de empresas`}
                            href={`/admin/companies?q=${encodeURIComponent(c.slug)}`}
                          />
                          <IconAction
                            intent="open"
                            label={`Abrir painel de ${c.name}`}
                            href={`/${c.slug}/dashboard`}
                          />
                        </RowActions>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
