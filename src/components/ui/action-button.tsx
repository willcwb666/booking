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
  primary: "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-2xs hover:shadow-xs",
  secondary: "bg-slate-900 hover:bg-slate-800 text-white border-transparent shadow-2xs",
  outline: "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs",
  ghost: "bg-transparent hover:bg-slate-100 text-slate-600 border-transparent",
  danger: "bg-red-50 hover:bg-red-100 text-red-700 border-red-200/60 shadow-2xs",
};

const SIZE_STYLES: Record<NonNullable<ActionButtonProps["size"]>, { btn: string; icon: string; text: string }> = {
  sm: {
    btn: "px-2.5 py-1.5 text-xs rounded-lg gap-1.5",
    icon: "w-3.5 h-3.5",
    text: "text-xs font-semibold",
  },
  md: {
    btn: "px-3.5 py-2 text-xs rounded-xl gap-2",
    icon: "w-4 h-4",
    text: "text-xs font-bold",
  },
  lg: {
    btn: "px-4 py-2.5 text-sm rounded-xl gap-2.5",
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
