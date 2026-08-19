"use client";

import React from "react";
import type { Breakdown } from "@/server/queries/analytics";
import { useChartTheme } from "./chart-theme";

type Props = {
  items: Breakdown[];
  /** Formata o valor principal exibido à direita. */
  format?: (value: number) => string;
  /** Formata o valor secundário, quando houver (ex.: receita ao lado da contagem). */
  formatSecondary?: (value: number) => string;
  emptyLabel?: string;
  /** Colore cada linha com a paleta categórica em vez de usar só o acento. */
  categorical?: boolean;
  max?: number;
};

/**
 * Ranking com barra proporcional.
 *
 * Para categoria ordenada isto lê melhor que rosca ou pizza: o olho compara
 * comprimento com precisão e ângulo não. A rosca fica reservada a composição
 * de um todo com poucas fatias.
 */
export function BreakdownBars({
  items,
  format = (v) => new Intl.NumberFormat().format(v),
  formatSecondary,
  emptyLabel = "Sem dados no período",
  categorical = false,
  max,
}: Props) {
  const theme = useChartTheme();

  if (items.length === 0) {
    return (
      <p
        className="py-8 text-center text-[var(--color-text-muted)]"
        style={{ fontSize: "var(--text-sm)" }}
      >
        {emptyLabel}
      </p>
    );
  }

  const peak = max ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item, index) => {
        const pct = Math.max(2, (item.value / peak) * 100);
        const color = categorical
          ? theme.categorical[index % theme.categorical.length]
          : theme.accent;

        return (
          <li key={`${item.label}-${index}`} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span
                className="text-[var(--color-text)] truncate"
                style={{ fontSize: "var(--text-sm)" }}
              >
                {item.label}
              </span>
              <span className="shrink-0 flex items-baseline gap-2">
                {formatSecondary && item.secondary !== undefined && (
                  <span
                    className="text-[var(--color-text-subtle)] font-mono tabular-nums"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    {formatSecondary(item.secondary)}
                  </span>
                )}
                <span className="font-mono tabular-nums font-medium text-[var(--color-text-heading)]">
                  {format(item.value)}
                </span>
              </span>
            </div>
            <div
              className="h-1.5 rounded-[var(--radius-full)] bg-[var(--color-bg-subtle)] overflow-hidden"
              role="presentation"
            >
              <div
                className="h-full rounded-[var(--radius-full)]"
                style={{
                  width: `${pct}%`,
                  background: color,
                  transition: "width var(--dur-base) var(--ease-out)",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
