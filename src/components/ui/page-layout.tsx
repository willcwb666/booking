import React from "react";
import { cn } from "@/lib/utils";

type PageLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("page-container", className)}>
      <div className="page-content">{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("page-header flex items-start justify-between gap-4", className)}>
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
  large,
}: PageLayoutProps & { large?: boolean }) {
  return <div className={cn("card", large && "card-lg", className)}>{children}</div>;
}

export function CardHeader({ children, className }: PageLayoutProps) {
  return <div className={cn("card-header", className)}>{children}</div>;
}

export function CardBody({ children, className }: PageLayoutProps) {
  return <div className={cn("card-body", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("stat-card", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="stat-card-label truncate">{label}</span>
        {icon && (
          <span
            className="w-8 h-8 rounded-[var(--radius-control)] grid place-items-center shrink-0 bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <p className="stat-card-value">{value}</p>
      {sub && (
        <p
          className="text-[var(--color-text-muted)]"
          style={{ fontSize: "var(--text-xs)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/** Agrupa conteúdo com divisória em vez de empilhar caixa dentro de caixa. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("section", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            {title && <h2 className="card-title">{title}</h2>}
            {description && (
              <p
                className="text-[var(--color-text-muted)] mt-1 measure"
                style={{ fontSize: "var(--text-sm)" }}
              >
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Barra de busca/filtros acima de uma lista. */
export function Toolbar({ children, className }: PageLayoutProps) {
  return <div className={cn("toolbar", className)}>{children}</div>;
}
