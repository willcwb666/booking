"use client";

import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Breakdown } from "@/server/queries/analytics";
import { useChartTheme, usePrefersReducedMotion } from "./chart-theme";

type Props = {
  items: Breakdown[];
  /** Rótulo do total exibido no miolo. */
  centerLabel?: string;
  height?: number;
  /** Mapeia um rótulo para um tom semântico (ex.: CANCELLED → danger). */
  toneFor?: (label: string) => "accent" | "success" | "warning" | "danger" | "navy" | undefined;
  formatLabel?: (label: string) => string;
};

/**
 * Rosca para composição de um todo.
 *
 * Só vale quando as fatias somam algo com significado e são poucas — acima de
 * ~6 categorias o olho perde a comparação e a lista com barras é melhor.
 */
export function DonutChart({
  items,
  centerLabel,
  height = 220,
  toneFor,
  formatLabel = (l) => l,
}: Props) {
  const theme = useChartTheme();
  const reducedMotion = usePrefersReducedMotion();

  const total = items.reduce((acc, i) => acc + i.value, 0);

  if (total === 0) {
    return (
      <p
        className="py-8 text-center text-[var(--color-text-muted)]"
        style={{ fontSize: "var(--text-sm)" }}
      >
        Sem dados no período
      </p>
    );
  }

  const colorFor = (label: string, index: number) => {
    const tone = toneFor?.(label);
    if (tone === "success") return theme.success;
    if (tone === "warning") return theme.warning;
    if (tone === "danger") return theme.danger;
    if (tone === "navy") return theme.navy;
    if (tone === "accent") return theme.accent;
    return theme.categorical[index % theme.categorical.length];
  };

  const data = items.map((i) => ({ ...i, name: formatLabel(i.label) }));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke={theme.surface}
              strokeWidth={2}
              isAnimationActive={!reducedMotion}
              animationDuration={260}
            >
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={colorFor(entry.label, index)} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center">
            <span className="block stat-card-value" style={{ fontSize: "var(--text-2xl)" }}>
              {new Intl.NumberFormat().format(total)}
            </span>
            {centerLabel && <span className="eyebrow">{centerLabel}</span>}
          </div>
        </div>
      </div>

      <ul className="flex-1 min-w-0 space-y-2 w-full">
        {data.map((entry, index) => (
          <li key={entry.label} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-[var(--radius-full)] shrink-0"
              style={{ background: colorFor(entry.label, index) }}
            />
            <span
              className="flex-1 min-w-0 truncate text-[var(--color-text)]"
              style={{ fontSize: "var(--text-sm)" }}
            >
              {entry.name}
            </span>
            <span className="font-mono tabular-nums text-[var(--color-text-heading)] shrink-0">
              {entry.value}
            </span>
            <span
              className="font-mono tabular-nums text-[var(--color-text-subtle)] shrink-0 w-11 text-right"
              style={{ fontSize: "var(--text-xs)" }}
            >
              {((entry.value / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="card px-3 py-2 shadow-md" style={{ background: "var(--color-bg)" }}>
      <p className="eyebrow">{item.name}</p>
      <p className="font-medium text-[var(--color-text-heading)] tabular-nums">
        {item.value}{" "}
        <span className="text-[var(--color-text-muted)] font-normal">
          ({((item.value / total) * 100).toFixed(1)}%)
        </span>
      </p>
    </div>
  );
}
