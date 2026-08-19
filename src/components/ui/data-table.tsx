"use client";

import React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** Coluna numérica: alinha à direita e usa dígitos tabulares. */
  numeric?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  /** Rótulo acessível da tabela (lido por leitores de tela). */
  caption?: string;
  pagination?: {
    page: number;
    pageCount: number;
    total: number;
    pageSize?: number;
    onPageChange: (newPage: number) => void;
    onPageSizeChange?: (newPageSize: number) => void;
  };
  className?: string;
}

/**
 * Tabela de dados.
 *
 * O carregamento usa esqueleto no formato de LINHA DE TABELA — antes o
 * esqueleto era um cartão com avatar, que não parecia com o resultado e fazia
 * a tela pular quando os dados chegavam.
 *
 * A rolagem horizontal fica dentro do container (`.table-container`), então
 * uma tabela larga nunca faz o corpo da página rolar de lado no celular.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle = "Nada por aqui ainda",
  emptyDescription = "Quando houver registros, eles aparecem nesta lista.",
  emptyAction,
  emptyIcon,
  caption,
  pagination,
  className = "",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={`table-container ${className}`} aria-busy="true">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.headerClassName}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }, (_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key}>
                    <span
                      className="skeleton skeleton-text block"
                      style={{ width: `${55 + ((i * 7 + col.key.length * 5) % 40)}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`card ${className}`}>
        <EmptyState
          icon={emptyIcon ?? <Search className="w-5 h-5" />}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="table-container">
        <table className="table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`${col.numeric ? "num" : ""} ${col.headerClassName ?? ""}`}
                  style={col.numeric ? { textAlign: "right" } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={keyExtractor(item)}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${col.numeric ? "num" : ""} ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(item)
                      : ((item as Record<string, unknown>)[col.key] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.page}
          totalItems={pagination.total}
          pageSize={pagination.pageSize ?? 10}
          pageSizeOptions={[10, 20, 30, 50, 100]}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  );
}
