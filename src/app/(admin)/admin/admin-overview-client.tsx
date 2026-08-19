"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { RangeFilter } from "@/components/ui/range-filter";
import { DeltaStat } from "@/components/ui/delta-stat";
import { EmptyState } from "@/components/ui/empty-state";
import { SuperAdminAICopilot } from "@/components/ui/super-admin-ai-copilot";
import { TrendChart } from "@/components/charts/trend-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { BreakdownBars } from "@/components/charts/breakdown-bars";
import {
  Activity,
  Building2,
  Calendar,
  DollarSign,
  Shield,
  Tag,
  Users,
} from "@/components/ui/icons";
import type { AnalyticsRange } from "@/lib/analytics-range";
import type {
  PlatformActivityItem,
  PlatformOverview,
} from "@/server/queries/analytics";
import type { CompanySelectorItem } from "@/server/queries/admin";

type Props = {
  range: AnalyticsRange;
  overview: PlatformOverview;
  activity: PlatformActivityItem[];
  companies?: CompanySelectorItem[];
  /** Moeda em foco. `undefined` = todas, lado a lado. */
  currency?: string;
};

/** Locale de formatação de cada moeda — só afeta separador e posição do símbolo. */
const CURRENCY_LOCALE: Record<string, string> = {
  BRL: "pt-BR",
  USD: "en-US",
  EUR: "pt-PT",
};

function formatMoney(value: number, currency: string): string {
  return value.toLocaleString(CURRENCY_LOCALE[currency] ?? "pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

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

const SHORTCUTS = [
  {
    href: "/admin/companies",
    icon: <Building2 className="w-4 h-4" />,
    title: "Empresas",
    desc: "Cadastro, planos e domínios",
  },
  {
    href: "/admin/financeiro",
    icon: <DollarSign className="w-4 h-4" />,
    title: "Financeiro",
    desc: "Assinaturas, cobrança e webhooks",
  },
  {
    href: "/admin/modulos",
    icon: <Tag className="w-4 h-4" />,
    title: "Módulos",
    desc: "Licenças por empresa",
  },
  {
    href: "/admin/infraestrutura",
    icon: <Shield className="w-4 h-4" />,
    title: "Infraestrutura",
    desc: "Saúde do banco e da fila",
  },
];

export function AdminOverviewClient({
  range,
  overview,
  activity,
  companies = [],
  currency,
}: Props) {
  const locale = "pt-BR";
  const count = (v: number) => new Intl.NumberFormat(locale).format(v);

  const compareLabel =
    range.key === "custom" ? `${range.days} dias anteriores` : `${range.label} anteriores`;

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Plataforma"
        categoryIcon={<Activity className="w-3.5 h-3.5" />}
        title="Visão geral"
        description="Movimento de toda a base: quanto foi agendado, quanto entrou e quem chegou no período."
        action={
          <Link href="/admin/companies" className="btn btn-outline btn-sm">
            {companies.length} {companies.length === 1 ? "empresa" : "empresas"}
          </Link>
        }
      />

      <RangeFilter range={range} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DeltaStat
          label="Agendamentos"
          delta={overview.bookings}
          format={count}
          compareLabel={compareLabel}
          icon={<Calendar className="w-3 h-3" />}
        />
        <DeltaStat
          label="Novas empresas"
          delta={overview.newCompanies}
          format={count}
          compareLabel={compareLabel}
          icon={<Building2 className="w-3 h-3" />}
        />
        <DeltaStat
          label="Novos usuários"
          delta={overview.newUsers}
          format={count}
          compareLabel={compareLabel}
          icon={<Users className="w-3 h-3" />}
        />
      </div>

      {/* Receita: um bloco por moeda, nunca um total consolidado.
          Empresas operam em mercados diferentes e não existe conversão certa
          a fazer — a taxa muda todo dia, e o número exibido passaria a depender
          de quando a página foi aberta. */}
      <div className="card">
        <div className="card-header">
          <div className="min-w-0">
            <h2 className="card-title">Receita processada</h2>
            <p
              className="text-[var(--color-text-muted)]"
              style={{ fontSize: "var(--text-xs)" }}
            >
              Separada por mercado — valores de moedas diferentes não são somados
            </p>
          </div>
          {overview.currencies.length > 1 && (
            <CurrencyFilter selected={currency} options={overview.currencies} />
          )}
        </div>
        <div className="card-body">
          {overview.revenueByCurrency.length === 0 ? (
            <EmptyState
              icon={<DollarSign className="w-5 h-5" />}
              title="Sem receita no período"
              description="Nenhum agendamento pago no recorte selecionado."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.revenueByCurrency.map((r) => (
                <DeltaStat
                  key={r.currency}
                  label={`Receita · ${r.currency}`}
                  delta={r.delta}
                  format={(v) => formatMoney(v, r.currency)}
                  compareLabel={compareLabel}
                  icon={<DollarSign className="w-3 h-3" />}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <SuperAdminAICopilot />

      <div className="card">
        <div className="card-header">
          <div className="min-w-0">
            <h2 className="card-title">Evolução</h2>
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
          {/* Sem métrica de receita: um eixo de dinheiro só faria sentido com
              uma moeda, e a série aqui atravessa todos os mercados. */}
          <TrendChart
            data={overview.series}
            granularity={range.granularity}
            locale={locale}
            height={300}
            metrics={[
              { key: "bookings", label: "Agendamentos", kind: "number", tone: "navy" },
              { key: "companies", label: "Novas empresas", kind: "number", tone: "success" },
              { key: "users", label: "Novos usuários", kind: "number", tone: "warning" },
            ]}
          />
        </div>
      </div>

      {/* Assinaturas: retrato de agora, não do recorte — por isso fica em um
          bloco separado, com o rótulo dizendo isso. */}
      <div className="card">
        <div className="card-header">
          <div className="min-w-0">
            <h2 className="card-title">Assinaturas</h2>
            <p
              className="text-[var(--color-text-muted)]"
              style={{ fontSize: "var(--text-xs)" }}
            >
              Posição atual da base — não acompanha o filtro de período · cobrança
              em {overview.billingCurrency}
            </p>
          </div>
          <Link href="/admin/financeiro" className="btn btn-ghost btn-sm">
            Financeiro
          </Link>
        </div>
        <div className="card-body grid grid-cols-2 lg:grid-cols-5 gap-4">
          {(
            [
              // Ao contrário da receita das empresas, o MRR não é segmentado:
              // a plataforma cobra assinatura numa moeda só. O rótulo existe
              // para o número não ser lido na moeda errada.
              ["MRR", formatMoney(overview.mrr, overview.billingCurrency)],
              ["ARR", formatMoney(overview.arr, overview.billingCurrency)],
              ["ARPU", formatMoney(overview.arpu, overview.billingCurrency)],
              ["Ativas", count(overview.activeSubscriptions)],
              ["Inadimplentes", count(overview.overdueSubscriptions)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="space-y-1">
              <span className="stat-card-label">{label}</span>
              <span
                className="stat-card-value block"
                style={{ fontSize: "var(--text-xl)" }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Situação dos agendamentos
            </h2>
          </div>
          <div className="card-body">
            <DonutChart
              items={overview.statusBreakdown}
              centerLabel="no período"
              toneFor={(label) => STATUS_TONES[label]}
              formatLabel={(label) => STATUS_LABELS[label] ?? label}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Empresas por plano
            </h2>
            <Link href="/admin/plans" className="btn btn-ghost btn-sm">
              Planos
            </Link>
          </div>
          <div className="card-body">
            <BreakdownBars
              items={overview.planBreakdown}
              categorical
              format={(v) => `${v}`}
              emptyLabel="Nenhuma empresa ativa"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
            Empresas com maior movimento
          </h2>
          <span className="eyebrow">{range.label}</span>
        </div>

        {overview.topCompanies.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-5 h-5" />}
            title="Nenhum movimento no período"
            description="Nenhuma empresa registrou agendamentos no recorte selecionado."
          />
        ) : (
          <div
            className="table-container"
            style={{ border: 0, borderRadius: 0, boxShadow: "none" }}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th className="text-right">Agendamentos</th>
                  <th className="text-right">Receita</th>
                  <th className="text-right">Painel</th>
                </tr>
              </thead>
              <tbody>
                {overview.topCompanies.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium text-[var(--color-text-heading)]">
                      {c.name}
                    </td>
                    <td data-type="number">{count(c.bookings)}</td>
                    <td data-type="number">{formatMoney(c.revenue, c.currency)}</td>
                    <td>
                      <div className="flex justify-end">
                        <Link href={`/${c.slug}/dashboard`} className="btn btn-ghost btn-sm">
                          Abrir
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Atividade recente
            </h2>
          </div>
          <div className="card-body">
            {activity.length === 0 ? (
              <p
                className="py-6 text-center text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-sm)" }}
              >
                Nada registrado ainda.
              </p>
            ) : (
              <ul className="space-y-3">
                {activity.map((item, i) => (
                  <li
                    key={`${item.kind}-${item.at}-${i}`}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-text-muted)] grid place-items-center shrink-0"
                      aria-hidden="true"
                    >
                      {item.kind === "company" ? (
                        <Building2 className="w-3.5 h-3.5" />
                      ) : item.kind === "booking" ? (
                        <Calendar className="w-3.5 h-3.5" />
                      ) : (
                        <Users className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-[var(--color-text-heading)] truncate">
                          {item.title}
                        </span>
                        <span className="eyebrow shrink-0">
                          {relativeTime(item.at)}
                        </span>
                      </div>
                      <p
                        className="text-[var(--color-text-muted)] truncate"
                        style={{ fontSize: "var(--text-xs)" }}
                      >
                        {item.kind === "company"
                          ? `Nova empresa · ${item.detail}`
                          : item.kind === "booking"
                            ? `Novo agendamento · ${item.detail}`
                            : `Novo usuário · ${item.detail}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Atalhos
            </h2>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="p-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] transition-colors hover:border-[var(--color-border-strong)] block"
              >
                <span className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] grid place-items-center mb-2">
                  {s.icon}
                </span>
                <span className="block font-medium text-[var(--color-text-heading)]">
                  {s.title}
                </span>
                <span
                  className="block text-[var(--color-text-muted)]"
                  style={{ fontSize: "var(--text-xs)" }}
                >
                  {s.desc}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Foco em um mercado. O padrão é "Todas" — a primeira pergunta do super admin é
 * como a plataforma está, e a resposta não pode exigir escolher uma moeda antes.
 *
 * As opções vêm do banco (`SELECT DISTINCT currency FROM company`), então abrir
 * um mercado novo aparece aqui sem tocar em código.
 */
function CurrencyFilter({
  selected,
  options,
}: {
  selected?: string;
  options: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const go = (value?: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set("currency", value);
    else next.delete("currency");
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="segmented" data-pending={pending || undefined}>
      <button
        type="button"
        className="segmented-item"
        aria-pressed={!selected}
        data-active={!selected || undefined}
        onClick={() => go(undefined)}
      >
        Todas
      </button>
      {options.map((c) => (
        <button
          key={c}
          type="button"
          className="segmented-item"
          aria-pressed={selected === c}
          data-active={selected === c || undefined}
          onClick={() => go(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
