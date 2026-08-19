"use client";

import React from "react";
import { TrendingUp, ArrowRight } from "@/components/ui/icons";

export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number; // ex.: 12.5 para +12,5%
    label?: string; // ex.: "vs. mês anterior"
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  loading?: boolean;
  className?: string;
}

/** Cor do ícone por variante — sempre via token, nunca paleta fixa do Tailwind. */
const ACCENT: Record<
  NonNullable<MetricCardProps["variant"]>,
  { fg: string; bg: string }
> = {
  default: { fg: "var(--color-text-muted)", bg: "var(--color-bg-subtle)" },
  primary: { fg: "var(--color-primary)", bg: "var(--color-primary-light)" },
  success: { fg: "var(--color-success)", bg: "var(--color-success-light)" },
  warning: { fg: "var(--color-warning)", bg: "var(--color-warning-light)" },
  danger: { fg: "var(--color-danger)", bg: "var(--color-danger-light)" },
};

/**
 * Cartão de métrica.
 *
 * O número é o protagonista: ele fica grande, em dígitos tabulares (senão a
 * coluna de KPIs "dança" quando o valor muda) e o rótulo vira serviço.
 * A variação usa seta + sinal além da cor — quem não distingue vermelho de
 * verde ainda precisa ler se subiu ou caiu.
 */
export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = "default",
  loading = false,
  className = "",
}: MetricCardProps) {
  const accent = ACCENT[variant];

  // Esqueleto com a MESMA forma do conteúdo final — evita o salto de layout
  // quando os dados chegam.
  if (loading) {
    return (
      <div className={`stat-card ${className}`} aria-busy="true">
        <div className="flex items-center justify-between gap-3">
          <span className="skeleton skeleton-text w-24" />
          <span className="skeleton w-8 h-8 rounded-[var(--radius-control)]" />
        </div>
        <span className="skeleton h-7 w-28 rounded-[var(--radius-sm)]" />
        <span className="skeleton skeleton-text w-32" />
      </div>
    );
  }

  const dir = trend ? (trend.value > 0 ? "up" : trend.value < 0 ? "down" : "flat") : null;

  return (
    <div className={`stat-card ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="stat-card-label truncate">{title}</span>
        {icon && (
          <span
            className="w-8 h-8 rounded-[var(--radius-control)] grid place-items-center shrink-0"
            style={{ color: accent.fg, background: accent.bg }}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>

      <p className="stat-card-value">{value}</p>

      {(trend || description) && (
        <p className="flex items-center gap-1.5 flex-wrap">
          {trend && dir && (
            <span
              className="stat-card-delta inline-flex items-center gap-0.5"
              data-trend={dir}
            >
              {dir === "flat" ? (
                <ArrowRight className="w-3 h-3 shrink-0" />
              ) : (
                <TrendingUp
                  className="w-3 h-3 shrink-0"
                  style={dir === "down" ? { transform: "scaleY(-1)" } : undefined}
                />
              )}
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
          )}
          {(trend?.label || description) && (
            <span
              className="text-[var(--color-text-muted)] truncate"
              style={{ fontSize: "var(--text-xs)" }}
            >
              {trend?.label ?? description}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
