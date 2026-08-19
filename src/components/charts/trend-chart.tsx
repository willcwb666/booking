"use client";

import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bucketLabel, type Granularity } from "@/lib/analytics-range";
import { formatMoney } from "@/lib/format";
import { useChartTheme, usePrefersReducedMotion } from "./chart-theme";

export type MetricKind = "number" | "currency" | "percent";

export type MetricDef = {
  key: string;
  label: string;
  kind: MetricKind;
  /** Chave de cor do tema; o padrão é o acento. */
  tone?: "accent" | "success" | "warning" | "danger" | "navy";
};

type Row = { bucket: string } & Record<string, number | string>;

type Props = {
  data: Row[];
  metrics: MetricDef[];
  granularity: Granularity;
  /** Só exigida quando alguma métrica é `kind: "currency"`. */
  currency?: string;
  locale: string;
  height?: number;
  /** Rótulo do período anterior, usado no texto de comparação do tooltip. */
  compareLabel?: string;
};

/** 1.240 → "1,2 mil". Eixo Y com número inteiro longo vira parede de dígitos. */
function compact(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function TrendChart({
  data,
  metrics,
  granularity,
  currency,
  locale,
  height = 280,
  compareLabel,
}: Props) {
  const theme = useChartTheme();
  const reducedMotion = usePrefersReducedMotion();

  const [metricKey, setMetricKey] = useState(metrics[0]?.key ?? "");
  const [shape, setShape] = useState<"area" | "bar">("area");

  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];

  const color =
    metric?.tone === "success"
      ? theme.success
      : metric?.tone === "warning"
        ? theme.warning
        : metric?.tone === "danger"
          ? theme.danger
          : metric?.tone === "navy"
            ? theme.navy
            : theme.accent;

  const rows: Row[] = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: bucketLabel(String(d.bucket), granularity),
      })),
    [data, granularity]
  );

  const format = useMemo(() => {
    return (value: number) => {
      if (!metric) return String(value);
      if (metric.kind === "currency")
        return formatMoney(value, currency ?? "BRL", locale);
      if (metric.kind === "percent") return `${value.toFixed(1)}%`;
      return new Intl.NumberFormat(locale).format(value);
    };
  }, [metric, currency, locale]);

  const total = rows.reduce((acc, r) => acc + Number(r[metricKey] ?? 0), 0);

  // Série inteiramente zerada: um gráfico rente ao eixo não comunica "sem
  // dados", comunica "algo quebrou". Melhor dizer com todas as letras.
  const isEmpty = total === 0;

  const axisTick = {
    fill: theme.axis,
    fontSize: 11,
    fontFamily: "var(--font-mono)",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {metrics.length > 1 && (
          <div className="segmented" role="tablist" aria-label="Métrica exibida">
            {metrics.map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={metricKey === m.key}
                data-active={metricKey === m.key}
                onClick={() => setMetricKey(m.key)}
                className="segmented-item whitespace-nowrap"
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <span className="toolbar-spacer" />

        <div className="segmented" role="tablist" aria-label="Formato do gráfico">
          {(
            [
              { id: "area" as const, label: "Área" },
              { id: "bar" as const, label: "Barras" },
            ]
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={shape === s.id}
              data-active={shape === s.id}
              onClick={() => setShape(s.id)}
              className="segmented-item"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isEmpty ? (
        <div
          className="grid place-items-center text-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)]"
          style={{ height }}
        >
          <div className="space-y-1 px-6">
            <p className="font-medium text-[var(--color-text-heading)]">
              Nenhum registro neste período
            </p>
            <p
              className="text-[var(--color-text-muted)]"
              style={{ fontSize: "var(--text-sm)" }}
            >
              Amplie o recorte ou escolha outra data para ver movimento aqui.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            {shape === "area" ? (
              <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`fill-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: theme.grid }}
                  minTickGap={24}
                />
                <YAxis
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => compact(v, locale)}
                />
                <Tooltip
                  cursor={{ stroke: theme.grid, strokeWidth: 1 }}
                  content={
                    <ChartTooltip
                      format={format}
                      metricLabel={metric?.label ?? ""}
                      compareLabel={compareLabel}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey={metricKey}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#fill-${metricKey})`}
                  isAnimationActive={!reducedMotion}
                  animationDuration={260}
                  animationEasing="ease-out"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
                />
              </AreaChart>
            ) : (
              <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: theme.grid }}
                  minTickGap={16}
                />
                <YAxis
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => compact(v, locale)}
                />
                <Tooltip
                  cursor={{ fill: theme.grid, fillOpacity: 0.35 }}
                  content={
                    <ChartTooltip
                      format={format}
                      metricLabel={metric?.label ?? ""}
                      compareLabel={compareLabel}
                    />
                  }
                />
                <Bar
                  dataKey={metricKey}
                  fill={color}
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={!reducedMotion}
                  animationDuration={260}
                  animationEasing="ease-out"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ value: number; payload: Record<string, unknown> }>;
  label?: string;
  format: (value: number) => string;
  metricLabel: string;
  compareLabel?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
  format,
  metricLabel,
}: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="card px-3 py-2 shadow-md"
      style={{ background: "var(--color-bg)" }}
      role="status"
    >
      <p className="eyebrow">{label}</p>
      <p className="font-medium text-[var(--color-text-heading)] tabular-nums">
        {format(Number(payload[0].value))}
      </p>
      <p
        className="text-[var(--color-text-muted)]"
        style={{ fontSize: "var(--text-xs)" }}
      >
        {metricLabel}
      </p>
    </div>
  );
}
