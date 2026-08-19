import React from "react";
import { cn } from "@/lib/utils";

/**
 * Esqueleto de carregamento.
 *
 * A regra é sempre a mesma: o esqueleto tem a FORMA do conteúdo que vai
 * chegar. Um roda-roda genérico não conta quanto falta nem reserva o espaço,
 * então a tela salta quando os dados aparecem — e o salto é a parte que o
 * usuário percebe como "lento".
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <span className={cn("skeleton block", className)} style={style} aria-hidden="true" />;
}

/** Linhas de texto. A última sai mais curta, como um parágrafo real. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <span className={cn("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === lines - 1 ? "62%" : "100%" }}
        />
      ))}
    </span>
  );
}

/** Grade de cartões de métrica — mesma forma do `MetricCard`. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Carregando indicadores"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="stat-card">
          <Skeleton className="skeleton-text w-24" />
          <Skeleton className="h-7 w-28 rounded-[var(--radius-sm)]" />
          <Skeleton className="skeleton-text w-32" />
        </div>
      ))}
    </div>
  );
}
