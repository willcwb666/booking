"use client";

import React from "react";
import Link from "next/link";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import type { BookingDashboardStats } from "@/server/queries/bookings";
import type { CompanyOverview } from "@/server/queries/analytics";
import type { AnalyticsRange } from "@/lib/analytics-range";
import {
  Calendar,
  CalendarRange,
  Clock,
  DollarSign,
  Star,
  Users,
  ArrowRight,
} from "@/components/ui/icons";
import { RangeFilter } from "@/components/ui/range-filter";
import { DeltaStat } from "@/components/ui/delta-stat";
import { TrendChart } from "@/components/charts/trend-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { BreakdownBars } from "@/components/charts/breakdown-bars";

type Props = {
  userName: string;
  company: {
    name: string;
    slug: string;
    businessType: string;
    planTier: string;
    planDisplayName: string;
    role: string;
  };
  stats: BookingDashboardStats;
  reviewStats: { average: number | null; count: number };
  range: AnalyticsRange;
  overview: CompanyOverview;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

/** "2026-08-18" → "Seg", sem passar pelo fuso local do navegador. */
function weekdayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function DashboardClient({
  userName,
  stats,
  reviewStats,
  range,
  overview,
}: Props) {
  const company = useCompany();

  const money = (v: number) => formatMoney(v, company.currency, company.locale);
  const count = (v: number) => new Intl.NumberFormat(company.locale).format(v);
  const percent = (v: number) => `${v.toFixed(1)}%`;

  const compareLabel =
    range.key === "custom"
      ? `${range.days} dias anteriores`
      : `${range.label} anteriores`;

  const peak = Math.max(1, ...stats.next7Days.map((d) => d.count));
  const weekTotal = stats.next7Days.reduce((sum, d) => sum + d.count, 0);
  const busiest = stats.next7Days.reduce(
    (best, d) => (d.count > best.count ? d : best),
    stats.next7Days[0] ?? { date: "", count: 0 }
  );

  return (
    <div className="page-container pb-20">
      <div id="conteudo" className="page-content space-y-8">
        <header className="page-header">
          <div className="min-w-0">
            <h1 className="page-title">Olá, {userName.split(" ")[0]}</h1>
            <p className="page-description">
              O que está acontecendo em {company.name} agora.
            </p>
          </div>
          <Link
            href={`/${company.slug}/schedule`}
            className="btn btn-primary btn-tactile"
          >
            <CalendarRange className="w-4 h-4" />
            Abrir agenda
          </Link>
        </header>

        {/*
          ── Agora ──
          Zona ao vivo. Fica sem elevação (borda, sem sombra) para se distinguir
          da zona de relatório abaixo, que é elevada e interativa. Assim dá para
          saber, só de olhar, o que é estado atual e o que é recorte histórico.
        */}
        <section aria-labelledby="secao-agora" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="secao-agora" className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Agora
            </h2>
            <span className="eyebrow">Estado atual da operação</span>
          </div>

          {/* Grid assimétrico: o painel de hoje carrega o peso e engole o
              gráfico da semana, que antes ocupava um cartão inteiro sozinho. */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <article className="lg:col-span-7 rounded-[var(--radius-panel)] border border-[var(--color-border)] bg-[var(--color-bg)] p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="stat-card-label flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Atendimentos hoje
                  </span>
                  <span className="stat-card-value block mt-1">
                    {stats.todayCount}
                  </span>
                  <p
                    className="text-[var(--color-text-muted)] mt-1"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    {weekTotal === 0
                      ? "Nenhum agendamento nos próximos 7 dias."
                      : `${weekTotal} nos próximos 7 dias, com pico em ${weekdayOf(busiest.date)}.`}
                  </p>
                </div>

                <Link
                  href={`/${company.slug}/agendamentos`}
                  className="btn btn-outline btn-sm shrink-0"
                >
                  Ver lista
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Distribuição dos 7 dias: contagem real por dia, vinda de um
                  groupBy no banco. Uma versão anterior desenhava as barras a
                  partir de percentuais escritos no código. */}
              {weekTotal > 0 && (
                <ol className="flex items-end justify-between gap-2 h-24 mt-auto" role="list">
                  {stats.next7Days.map((d, i) => {
                    const heightPct = Math.round((d.count / peak) * 100);
                    const label = `${weekdayOf(d.date)}: ${d.count} agendamento${d.count === 1 ? "" : "s"}`;
                    return (
                      <li
                        key={d.date}
                        className="flex-1 flex flex-col items-center gap-1 min-w-0"
                        title={label}
                      >
                        <span
                          className="mono text-[var(--color-text-heading)] tabular-nums"
                          style={{ fontSize: "var(--text-2xs)" }}
                        >
                          {d.count}
                        </span>
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full rounded-t-[var(--radius-sm)]"
                            style={{
                              // Altura mínima visível para o zero não sumir:
                              // um dia vazio também é informação.
                              height: `${Math.max(2, heightPct)}%`,
                              background:
                                d.count === 0
                                  ? "var(--color-bg-muted)"
                                  : "var(--color-primary)",
                              opacity:
                                d.count === 0 ? 1 : 0.55 + (heightPct / 100) * 0.45,
                            }}
                            role="img"
                            aria-label={label}
                          />
                        </div>
                        <span
                          className="text-[var(--color-text-muted)]"
                          style={{ fontSize: "var(--text-2xs)" }}
                        >
                          {i === 0 ? "Hoje" : weekdayOf(d.date)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </article>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              {/* Pendências vêm primeiro e mudam de tom quando existem: um
                  painel deve dizer o que precisa de você, não só o que houve. */}
              <LiveStat
                href={`/${company.slug}/agendamentos?status=PENDING`}
                icon={<Clock className="w-3 h-3" />}
                label="Aguardando confirmação"
                value={String(stats.pendingCount)}
                hint={
                  stats.pendingCount > 0
                    ? "precisam de resposta"
                    : "nada pendente"
                }
                attention={stats.pendingCount > 0}
              />
              <LiveStat
                href={`/${company.slug}/schedule`}
                icon={<CalendarRange className="w-3 h-3" />}
                label="Próximos 7 dias"
                value={String(stats.upcomingWeekCount)}
                hint="agendamentos futuros"
              />
              <LiveStat
                href={`/${company.slug}/avaliacoes`}
                icon={<Star className="w-3 h-3" />}
                label="Avaliação média"
                value={
                  reviewStats.average !== null
                    ? reviewStats.average.toFixed(1)
                    : "—"
                }
                hint={
                  reviewStats.count > 0
                    ? `${reviewStats.count} avaliaç${reviewStats.count === 1 ? "ão" : "ões"}`
                    : "nenhuma ainda"
                }
              />
            </div>
          </div>
        </section>

        {/* ── Desempenho: tudo abaixo obedece ao filtro de período ── */}
        <section aria-labelledby="secao-desempenho" className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="secao-desempenho"
              className="card-title"
              style={{ fontSize: "var(--text-md)" }}
            >
              Desempenho
            </h2>
            <span className="eyebrow">Comparado com os {compareLabel}</span>
          </div>

          <RangeFilter range={range} />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
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
            {/* Cancelamento é a única métrica aqui em que cair é bom. */}
            <DeltaStat
              label="Cancelamento"
              delta={overview.cancellationRate}
              format={percent}
              invert
              compareLabel={compareLabel}
            />
          </div>

          <article className="card">
            <div className="card-header">
              <div className="min-w-0">
                <h3 className="card-title" style={{ fontSize: "var(--text-md)" }}>
                  Evolução
                </h3>
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
              <Link
                href={`/${company.slug}/relatorios`}
                className="btn btn-ghost btn-sm"
              >
                Relatórios
              </Link>
            </div>
            <div className="card-body">
              <TrendChart
                data={overview.series}
                granularity={range.granularity}
                currency={company.currency}
                locale={company.locale}
                height={280}
                metrics={[
                  { key: "revenue", label: "Recebido", kind: "currency", tone: "success" },
                  { key: "bookings", label: "Agendamentos", kind: "number", tone: "accent" },
                ]}
              />
            </div>
          </article>

          {/* Larguras alternadas (5/7 depois 7/5) em vez de uma grade 2×2 de
              cartões idênticos — a repartição que tem mais linhas ganha mais
              espaço, e o olho para de ler tudo com o mesmo peso. */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Panel
              className="lg:col-span-5"
              title="Situação dos agendamentos"
            >
              <DonutChart
                items={overview.statusBreakdown}
                centerLabel="no período"
                toneFor={(label) => STATUS_TONES[label]}
                formatLabel={(label) => STATUS_LABELS[label] ?? label}
              />
            </Panel>

            <Panel
              className="lg:col-span-7"
              title="Horários mais procurados"
              aside={<span className="eyebrow">agendamentos</span>}
            >
              <BreakdownBars
                items={overview.byHour}
                format={count}
                emptyLabel="Nenhum agendamento no período"
              />
            </Panel>

            <Panel
              className="lg:col-span-7"
              title="Serviços mais vendidos"
              aside={
                <Link href={`/${company.slug}/servicos`} className="btn btn-ghost btn-sm">
                  Catálogo
                </Link>
              }
            >
              <BreakdownBars
                items={overview.topServices}
                format={count}
                formatSecondary={money}
                emptyLabel="Nenhum serviço vendido no período"
              />
            </Panel>

            <Panel
              className="lg:col-span-5"
              title="Por profissional"
              aside={
                <Link
                  href={`/${company.slug}/profissionais`}
                  className="btn btn-ghost btn-sm"
                >
                  Equipe
                </Link>
              }
            >
              <BreakdownBars
                items={overview.byProfessional}
                categorical
                format={count}
                formatSecondary={money}
                emptyLabel="Nenhum atendimento no período"
              />
            </Panel>
          </div>
        </section>

        {/*
          Antes eram três cartões iguais lado a lado ("Ir para"). Os mesmos
          destinos já existem na barra lateral, então repetir como cartões era
          navegação duplicada ocupando um terço da dobra. Vira uma linha de
          links: mesma função, sem gastar hierarquia.
        */}
        <nav
          aria-label="Atalhos"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-[var(--color-border)]"
        >
          <span className="eyebrow">Ir para</span>
          {[
            { href: `/${company.slug}/agendamentos`, label: "Agendamentos" },
            { href: `/${company.slug}/schedule`, label: "Agenda" },
            { href: `/${company.slug}/clientes`, label: "Clientes" },
            { href: `/${company.slug}/booking`, label: "Página de agendamento" },
            { href: `/${company.slug}/configuracoes`, label: "Configurações" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] transition-colors"
              style={{ fontSize: "var(--text-sm)" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

/**
 * KPI ao vivo e clicável.
 *
 * Usa a mesma linguagem visual do `.stat-card` do relatório — o que muda é o
 * conteúdo da terceira linha (dica em vez de variação) e o feedback de clique,
 * já que aqui o cartão é um destino.
 */
function LiveStat({
  href,
  icon,
  label,
  value,
  hint,
  attention = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  attention?: boolean;
}) {
  return (
    <Link
      href={href}
      className="stat-card btn-tactile"
      style={
        attention
          ? {
              borderColor: "var(--color-warning-border)",
              background: "var(--color-warning-light)",
            }
          : undefined
      }
    >
      <span className="stat-card-label flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="stat-card-value" style={{ fontSize: "var(--text-2xl)" }}>
        {value}
      </span>
      <span className="stat-card-delta">{hint}</span>
    </Link>
  );
}

function Panel({
  title,
  aside,
  className = "",
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article className={`card ${className}`}>
      <div className="card-header">
        <h3 className="card-title" style={{ fontSize: "var(--text-md)" }}>
          {title}
        </h3>
        {aside}
      </div>
      <div className="card-body">{children}</div>
    </article>
  );
}
