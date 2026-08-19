"use client";

import { useState, useTransition } from "react";
import { removeWaitlistEntryAction } from "@/server/actions/waitlist";
import { Pagination } from "@/components/ui/pagination";

const STATUS_LABELS: Record<string, string> = {
  WAITING: "Aguardando",
  NOTIFIED: "Notificado",
  BOOKED: "Agendado",
  EXPIRED: "Expirado",
};

const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  NOTIFIED: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
  BOOKED: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  EXPIRED: "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]",
};

type Entry = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  preferredDate: string;
  preferredStartTime: string | null;
  status: string;
  configName: string;
  notifiedAt: string | null;
  createdAt: string;
};

export function WaitlistAdminClient({
  entries: initial,
  companySlug,
  canEdit,
}: {
  entries: Entry[];
  companySlug: string;
  canEdit: boolean;
}) {
  const [entries, setEntries] = useState(initial);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pending, startTransition] = useTransition();

  const paginatedEntries = entries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removeWaitlistEntryAction(id, companySlug);
      if (res.success) setEntries((prev) => prev.filter((e) => e.id !== id));
    });
  }

  if (entries.length === 0) {
    return (
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-12 text-center">
        <p className="text-[var(--color-text-muted)] text-sm">Nenhum cliente na lista de espera.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Serviço</th>
              <th>Data preferida</th>
              <th>Status</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {paginatedEntries.map((e) => (
              <tr key={e.id}>
                <td>
                  <p className="font-medium text-[var(--color-text-heading)]">{e.customerName}</p>
                  <p className="text-xs text-[var(--color-text-subtle)]">{e.customerEmail}</p>
                  {e.customerPhone && <p className="text-xs text-[var(--color-text-subtle)]">{e.customerPhone}</p>}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-heading)]">{e.configName}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-[var(--color-text-heading)]">{e.preferredDate.split("-").reverse().join("/")}</p>
                  {e.preferredStartTime && (
                    <p className="text-xs text-[var(--color-text-subtle)]">{e.preferredStartTime}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] ?? "bg-[var(--color-bg-muted)] text-[var(--color-text)]"}`}>
                    {STATUS_LABELS[e.status] ?? e.status}
                  </span>
                  {e.notifiedAt && (
                    <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                      Notif. {new Date(e.notifiedAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(e.id)}
                      disabled={pending}
                      className="text-xs text-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-40 transition-colors"
                    >
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {entries.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={entries.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 30, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="clientes em espera"
        />
      )}
    </div>
  );
}
