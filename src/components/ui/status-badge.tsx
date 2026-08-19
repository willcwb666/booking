"use client";

import React from "react";

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

/**
 * Distintivo de status.
 *
 * Três coisas mudaram e todas por um motivo:
 *
 *  · Cores saem de tokens. Antes vinham fixas da paleta do Tailwind, então o
 *    distintivo continuava claro mesmo no modo escuro — texto verde-escuro
 *    sobre fundo verde-escuro, ilegível.
 *
 *  · O ponto verde não pulsa mais. Um `animate-pulse` numa tabela de 50 linhas
 *    são 50 animações infinitas competindo pela atenção de quem só quer ler a
 *    coluna. Movimento que se vê dezenas de vezes por dia deve sumir.
 *
 *  · Não embrulha mais tudo num tooltip. O texto já está visível; um tooltip
 *    dizendo "Status: Ativo" sobre a palavra "Ativo" é ruído. Quando o rótulo
 *    está oculto (`showLabel={false}`), o nome vai no `title` e no leitor de
 *    tela, que é onde ele faz falta.
 */
const VARIANT_CLASS: Record<StatusBadgeVariant, string> = {
  primary: "badge-primary",
  secondary: "badge-primary",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-primary",
  neutral: "badge-neutral",
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
  // Normaliza rótulos equivalentes vindos de telas diferentes
  let label = children;
  let resolved = variant;
  if (typeof children === "string") {
    const lower = children.toLowerCase();
    if (["habilitado", "ativa", "ativo"].includes(lower)) {
      label = "Ativo";
      if (variant === "neutral") resolved = "success";
    } else if (["desabilitado", "inativa", "inativo"].includes(lower)) {
      label = "Inativo";
    }
  }

  const labelText =
    typeof label === "string" ? label : String(label ?? resolved);

  return (
    <span
      className={`badge ${VARIANT_CLASS[resolved]} ${icon ? "badge-plain" : ""} ${className}`}
      style={
        size === "md"
          ? { fontSize: "var(--text-xs)", padding: "0.25rem 0.5rem" }
          : undefined
      }
      title={!showLabel ? (tooltip ?? labelText) : tooltip}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {showLabel ? <span>{label}</span> : <span className="sr-only">{labelText}</span>}
    </span>
  );
}
