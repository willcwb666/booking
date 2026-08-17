"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number; // e.g. 12.5 para +12.5%
    label?: string; // e.g. "vs. mês anterior"
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  loading?: boolean;
  className?: string;
}

const VARIANT_ACCENTS: Record<NonNullable<MetricCardProps["variant"]>, { bg: string; text: string; iconBg: string }> = {
  default: {
    bg: "bg-white",
    text: "text-slate-900",
    iconBg: "bg-slate-100 text-slate-600",
  },
  primary: {
    bg: "bg-white",
    text: "text-indigo-950",
    iconBg: "bg-indigo-50 text-indigo-600",
  },
  success: {
    bg: "bg-white",
    text: "text-emerald-950",
    iconBg: "bg-emerald-50 text-emerald-600",
  },
  warning: {
    bg: "bg-white",
    text: "text-amber-950",
    iconBg: "bg-amber-50 text-amber-600",
  },
  danger: {
    bg: "bg-white",
    text: "text-red-950",
    iconBg: "bg-red-50 text-red-600",
  },
};

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
  const styles = VARIANT_ACCENTS[variant];

  if (loading) {
    return (
      <div className={`p-5 rounded-2xl border border-slate-200/80 bg-white shadow-2xs animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-3.5 w-24 bg-slate-200 rounded-md" />
          <div className="h-9 w-9 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-7 w-32 bg-slate-200 rounded-lg mb-2" />
        <div className="h-3 w-40 bg-slate-100 rounded-md" />
      </div>
    );
  }

  return (
    <div
      className={`p-5 rounded-2xl border border-slate-200/80 ${styles.bg} shadow-2xs hover:shadow-xs transition-all duration-200 group ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${styles.iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${styles.text}`}>
          {value}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs">
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-md text-[11px] ${
              trend.value > 0
                ? "bg-emerald-50 text-emerald-700"
                : trend.value < 0
                  ? "bg-red-50 text-red-700"
                  : "bg-slate-50 text-slate-600"
            }`}
          >
            {trend.value > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend.value < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
          </span>
        )}

        {(trend?.label || description) && (
          <span className="text-slate-400 text-[11px] truncate">
            {trend?.label ?? description}
          </span>
        )}
      </div>
    </div>
  );
}
