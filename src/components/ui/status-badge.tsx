"use client";

import React from "react";
import { ActionTooltip } from "@/components/ui/action-tooltip";

export type StatusBadgeVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export interface StatusBadgeProps {
  children?: React.ReactNode;
  variant?: StatusBadgeVariant;
  size?: "sm" | "md";
  className?: string;
  showLabel?: boolean;
  tooltip?: string;
  icon?: React.ReactNode;
}

const CONTAINER_CLASSES: Record<StatusBadgeVariant, string> = {
  primary: "bg-indigo-50 border-indigo-200/80 text-indigo-700",
  secondary: "bg-purple-50 border-purple-200/80 text-purple-700",
  success: "bg-emerald-50 border-emerald-200/80 text-emerald-700",
  warning: "bg-amber-50 border-amber-200/80 text-amber-800",
  danger: "bg-red-50 border-red-200/80 text-red-700",
  info: "bg-sky-50 border-sky-200/80 text-sky-700",
  neutral: "bg-slate-100 border-slate-200 text-slate-600",
};

const DOT_CLASSES: Record<StatusBadgeVariant, string> = {
  primary: "bg-indigo-500",
  secondary: "bg-purple-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
  neutral: "bg-slate-400",
};

export function StatusBadge({
  children,
  variant = "neutral",
  size = "sm",
  className = "",
  showLabel = true,
  tooltip,
  icon,
}: StatusBadgeProps) {
  // Normalização do texto do status para exibição no Tooltip e Acessibilidade
  let formattedLabel = children;
  if (typeof children === "string") {
    const lower = children.toLowerCase();
    if (lower === "habilitado" || lower === "ativa" || lower === "ativo") {
      formattedLabel = "Ativo";
      variant = variant === "neutral" ? "success" : variant;
    } else if (lower === "desabilitado" || lower === "inativa" || lower === "inativo") {
      formattedLabel = "Inativo";
      variant = variant === "neutral" ? "neutral" : variant;
    }
  }

  const labelString = typeof formattedLabel === "string" ? formattedLabel : String(formattedLabel || variant);
  const tooltipText = tooltip || `Status: ${labelString}`;

  const dotSize = size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";
  const padding = showLabel ? (size === "md" ? "px-3 py-1 text-xs" : "px-2.5 py-0.5 text-[11px]") : (size === "md" ? "p-2" : "p-1.5");

  const badgeContent = (
    <span
      role="status"
      aria-label={tooltipText}
      className={`inline-flex items-center justify-center gap-1.5 border font-bold rounded-full tracking-wide transition-all select-none shadow-2xs ${CONTAINER_CLASSES[variant]} ${padding} ${className}`}
    >
      {icon ? (
        <span className="shrink-0">{icon}</span>
      ) : (
        <span
          className={`${dotSize} rounded-full shrink-0 ${DOT_CLASSES[variant]} ${
            variant === "success" ? "animate-pulse" : ""
          }`}
          aria-hidden="true"
        />
      )}
      {showLabel ? (
        <span className="capitalize font-semibold tracking-tight">{formattedLabel}</span>
      ) : (
        <span className="sr-only">{labelString}</span>
      )}
    </span>
  );

  return <ActionTooltip label={tooltipText}>{badgeContent}</ActionTooltip>;
}
