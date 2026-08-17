"use client";

import React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
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

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription = "Não há dados para exibir no momento.",
  emptyAction,
  pagination,
  className = "",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={`w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs ${className}`}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="h-4 w-32 bg-slate-200 rounded-md animate-pulse" />
          <div className="h-4 w-20 bg-slate-100 rounded-md animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 bg-slate-200 rounded-md" />
                  <div className="h-2.5 w-40 bg-slate-100 rounded-md" />
                </div>
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`w-full rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden ${className}`}>
        <EmptyState
          icon={<Inbox className="w-6 h-6" />}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/75">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 select-none ${col.headerClassName ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="hover:bg-slate-50/50 transition-colors group"
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 text-slate-700 ${col.className ?? ""}`}>
                    {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
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
