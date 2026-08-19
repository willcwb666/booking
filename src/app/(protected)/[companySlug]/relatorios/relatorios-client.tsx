"use client";

import React from "react";
import Link from "next/link";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import type { CompanyOverview } from "@/server/queries/analytics";
import type { AnalyticsRange } from "@/lib/analytics-range";
import { PageHeader } from "@/components/ui/page-header";
import { RangeFilter } from "@/components/ui/range-filter";
import { DeltaStat } from "@/components/ui/delta-stat";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendChart } from "@/components/charts/trend-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { BreakdownBars } from "@/components/charts/breakdown-bars";
import { FileText, DollarSign, Calendar, Users, Scissors } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  range: AnalyticsRange;
  overview: CompanyOverview;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Falta",
};

const STATUS_TONES: Record<
  string,
  "accent" | "success" | "warning" | "danger" | "navy"
> = {
  PENDING: "warning",
  CONFIRMED: "accent",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "navy",
};

export function CompanyRelatoriosClient({ companySlug, range, overview }: Props) {
  const company = useCompany();

  // A moeda vem da empresa. A versão anterior fixava pt-BR/BRL no código, então
  // uma empresa operando em dólar via os próprios números com "R$" na frente.
  const money = (v: number) => formatMoney(v, company.currency, company.locale);
  const count = (v: number) => new Intl.NumberFormat(company.locale).format(v);
  const percent = (v: number) => `${v.toFixed(1)}%`;

  const compareLabel =
    range.key === "custom"
      ? `${range.days} dias anteriores`
      : `${range.label} anteriores`;

  const completed =
    overview.statusBreakdown.find((s) => s.label === "COMPLETED")?.value ?? 0;
  const totalBookings = overview.bookings.current;
  const completionRate = totalBookings > 0 ? (completed / totalBookings) * 100 : 0;

  return (
    <div className="page-container pb-20">
      <div className="page-content space-y-6">
        <PageHeader
          category="Relatórios"
          categoryIcon={<FileText className="w-3.5 h-3.5" />}
          title="Desempenho"
          description="Faturamento, volume e composição dos atendimentos no período escolhido."
          action={
            <Link
              href={`/api/export/bookings?slug=${encodeURIComponent(companySlug)}&from=${range.from}&to=${range.to}`}
              className="btn btn-outline btn-sm"
            >
              Exportar CSV
            </Link>
          }
        />

        <RangeFilter range={range} />

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <DeltaStat
            label="Recebido"
            delta={overview.revenue}
            format={money}
            compareLabel={compareLabel}
            icon={<DollarSign className="w-3 h-3" />}
          />
          <DeltaStat
            label="Agendamentos"
            delta={overview.bookings}
            format={count}
            compareLabel={compareLabel}
            icon={<Calendar className="w-3 h-3" />}
          />
          <DeltaStat
            label="Ticket médio"
            delta={overview.ticket}
            format={money}
            compareLabel={compareLabel}
          />
          <DeltaStat
            label="Novos clientes"
            delta={overview.newCustomers}
            format={count}
            compareLabel={compareLabel}
            icon={<Users className="w-3 h-3" />}
          />
        </div>

        <article className="card">
          <div className="card-header">
            <div className="min-w-0">
              <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
                Evolução
              </h2>
              <p
                className="text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-xs)" }}
              >
                {range.label} · agrupado por{" "}
                {range.granularity === "day"
                  ? "dia"
                  : range.granularity === "week"
                    ? "semana"
                    : "mês"}
              </p>
            </div>
          </div>
          <div className="card-body">
            <TrendChart
              data={overview.series}
              granularity={range.granularity}
              currency={company.currency}
              locale={company.locale}
              height={300}
              metrics={[
                { key: "revenue", label: "Recebido", kind: "currency", tone: "success" },
                { key: "bookings", label: "Agendamentos", kind: "number", tone: "accent" },
              ]}
            />
          </div>
        </article>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <article className="lg:col-span-5 card">
            <div className="card-header">
              <div className="min-w-0">
                <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
                  Situação
                </h2>
                <p
                  className="text-[var(--color-text-muted)]"
                  style={{ fontSize: "var(--text-xs)" }}
                >
                  {percent(completionRate)} concluídos ·{" "}
                  {percent(overview.cancellationRate.current)} cancelados
                </p>
              </div>
            </div>
            <div className="card-body">
              <DonutChart
                items={overview.statusBreakdown}
                centerLabel="no período"
                toneFor={(label) => STATUS_TONES[label]}
                formatLabel={(label) => STATUS_LABELS[label] ?? label}
              />
            </div>
          </article>

          <article className="lg:col-span-7 card">
            <div className="card-header">
              <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
                Serviços mais rentáveis
              </h2>
              <Link
                href={`/${companySlug}/servicos`}
                className="btn btn-ghost btn-sm"
              >
                Catálogo
              </Link>
            </div>
            <div className="card-body">
              {overview.topServices.length === 0 ? (
                <EmptyState
                  icon={<Scissors className="w-5 h-5" />}
                  title="Nenhum serviço vendido no período"
                  description="Amplie o recorte ou escolha outra data para ver o ranking."
                />
              ) : (
                <BreakdownBars
                  items={overview.topServices}
                  format={count}
                  formatSecondary={money}
                />
              )}
            </div>
          </article>

          <article className="lg:col-span-7 card">
            <div className="card-header">
              <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
                Horários mais procurados
              </h2>
              <span className="eyebrow">agendamentos</span>
            </div>
            <div className="card-body">
              <BreakdownBars
                items={overview.byHour}
                format={count}
                emptyLabel="Nenhum agendamento no período"
              />
            </div>
          </article>

          <article className="lg:col-span-5 card">
            <div className="card-header">
              <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
                Por profissional
              </h2>
              <Link
                href={`/${companySlug}/profissionais`}
                className="btn btn-ghost btn-sm"
              >
                Equipe
              </Link>
            </div>
            <div className="card-body">
              <BreakdownBars
                items={overview.byProfessional}
                categorical
                format={count}
                formatSecondary={money}
                emptyLabel="Nenhum atendimento no período"
              />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
