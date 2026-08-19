"use client";

import React from "react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Dica secundária abaixo da ação (ex.: link para a documentação) */
  hint?: React.ReactNode;
  className?: string;
}

/**
 * Estado vazio.
 *
 * Uma tela sem dados é a primeira coisa que todo cliente novo vê. Ela precisa
 * dizer o que apareceria ali e como fazer aparecer — não só "nenhum
 * resultado". Por isso `action` é praticamente obrigatório na prática.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  hint,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="pt-1.5">{action}</div>}
      {hint && (
        <p
          className="text-[var(--color-text-subtle)]"
          style={{ fontSize: "var(--text-xs)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
