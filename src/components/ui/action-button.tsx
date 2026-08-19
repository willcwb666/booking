"use client";

import React from "react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Loader2 } from "lucide-react";

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  tooltipOnlyOnDesktop?: boolean;
  showTextAlways?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<NonNullable<ActionButtonProps["variant"]>, string> = {
  primary: "bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white border-transparent shadow-2xs hover:shadow-xs",
  secondary: "bg-[var(--color-navy)] hover:bg-[var(--color-navy)] text-white border-transparent shadow-2xs",
  outline: "bg-[var(--color-bg)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text)] border-[var(--color-border)] shadow-2xs",
  ghost: "bg-transparent hover:bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] border-transparent",
  danger: "bg-[var(--color-danger-light)] hover:bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[var(--color-danger-border)] shadow-2xs",
};

const SIZE_STYLES: Record<NonNullable<ActionButtonProps["size"]>, { btn: string; icon: string; text: string }> = {
  sm: {
    btn: "px-2.5 py-1.5 text-xs rounded-[var(--radius-control)] gap-1.5",
    icon: "w-3.5 h-3.5",
    text: "text-xs font-semibold",
  },
  md: {
    btn: "px-3.5 py-2 text-xs rounded-[var(--radius-control)] gap-2",
    icon: "w-4 h-4",
    text: "text-xs font-bold",
  },
  lg: {
    btn: "px-4 py-2.5 text-sm rounded-[var(--radius-control)] gap-2.5",
    icon: "w-4.5 h-4.5",
    text: "text-sm font-bold",
  },
};

/**
 * Componente de Ação Reutilizável com Design Responsivo Touch-First.
 * No mobile (touchscreen), exibe rótulo legível em vez de depender de hover/tooltip invisível.
 */
export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      label,
      icon,
      variant = "outline",
      size = "md",
      loading = false,
      disabled = false,
      showTextAlways = false,
      tooltipOnlyOnDesktop = true,
      className = "",
      onClick,
      type = "button",
      ...props
    },
    ref
  ) => {
    const vStyle = VARIANT_STYLES[variant];
    const sStyle = SIZE_STYLES[size];

    const content = (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        onClick={onClick}
        aria-label={label}
        className={`inline-flex items-center justify-center font-medium border transition-all select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${vStyle} ${sStyle.btn} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className={`${sStyle.icon} animate-spin shrink-0`} />
        ) : icon ? (
          <span className="shrink-0 flex items-center">{icon}</span>
        ) : null}

        <span
          className={`${sStyle.text} ${
            showTextAlways
              ? "inline-block"
              : tooltipOnlyOnDesktop
                ? "inline-block sm:sr-only md:not-sr-only md:inline-block"
                : "inline-block"
          }`}
        >
          {label}
        </span>
      </button>
    );

    if (tooltipOnlyOnDesktop && !showTextAlways) {
      return <ActionTooltip label={label}>{content}</ActionTooltip>;
    }

    return content;
  }
);
ActionButton.displayName = "ActionButton";
