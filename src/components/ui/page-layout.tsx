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
      <div className="flex items-center justify-between mb-3">
        <span className="stat-card-label">{label}</span>
        {icon && (
          <div className="p-2 rounded-xl bg-[var(--color-bg-muted)] border border-[var(--color-border)]">
            {icon}
          </div>
        )}
      </div>
      <p className="stat-card-value">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>}
    </div>
  );
}
