"use client";

import React from "react";
import type { Delta } from "@/server/queries/analytics";

type Props = {
  label: string;
  delta: Delta;
  format: (value: number) => string;
  /** Quando true, cair é bom (taxa de cancelamento, por exemplo). */
  invert?: boolean;
  /** Texto do período de comparação, ex.: "30 dias anteriores". */
  compareLabel: string;
  icon?: React.ReactNode;
};

/**
 * KPI com comparação obrigatória.
 *
 * Número sozinho não informa: "142 agendamentos" só quer dizer alguma coisa ao
 * lado do período anterior. Quando a base é zero a variação não é exibida —
 * "+100%" partindo do nada é o tipo de número inflado que faz um painel perder
 * a credibilidade.
 */
export function DeltaStat({
  label,
  delta,
  format,
  invert = false,
  compareLabel,
  icon,
}: Props) {
  const { current, previous, percent } = delta;

  const isFlat = percent === null || Math.abs(percent) < 0.05;
  const isUp = percent !== null && percent > 0;
  const isGood = invert ? !isUp : isUp;
  const trend = isFlat ? "flat" : isGood ? "up" : "down";

  return (
    <div className="stat-card">
      <span className="stat-card-label flex items-center gap-1.5">
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>
      </span>
      <span className="stat-card-value">{format(current)}</span>
      <span className="stat-card-delta" data-trend={trend === "flat" ? undefined : trend}>
        {percent === null ? (
          <>sem base de comparação</>
        ) : (
          <>
            {isFlat ? "estável" : `${isUp ? "+" : ""}${percent.toFixed(1)}%`}
            <span className="text-[var(--color-text-subtle)]">
              {" "}
              · {format(previous)} nos {compareLabel}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
