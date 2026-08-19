"use client";

import React from "react";

export interface PageHeaderProps {
  category?: string;
  categoryIcon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Cabeçalho de página.
 *
 * Antes fixava cores direto da paleta do Tailwind, o que fazia o cabeçalho
 * ignorar o tema escolhido e o modo escuro. Agora tudo sai dos tokens —
 * trocar o tema troca a tela inteira, não metade dela.
 */
export function PageHeader({
  category,
  categoryIcon,
  title,
  description,
  action,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`page-header ${className}`}>
      <div className="min-w-0">
        {category && (
          <p className="eyebrow flex items-center gap-1.5 mb-1.5">
            {categoryIcon && <span className="shrink-0">{categoryIcon}</span>}
            <span>{category}</span>
          </p>
        )}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>

      {action && (
        <div className="flex items-center gap-2 shrink-0">{action}</div>
      )}
    </div>
  );
}
