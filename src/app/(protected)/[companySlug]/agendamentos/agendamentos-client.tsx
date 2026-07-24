"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import { Phone } from "@/components/ui/icons";
import type { BookingListItem } from "@/server/queries/bookings";
import type { BookingStatus } from "@/generated/prisma/client";

type SerializedItem = Omit<BookingListItem, "createdAt"> & { createdAt: string };

type Filters = {
  status: BookingStatus | "ALL";
  from: string;
  to: string;
  q: string;
};

type Props = {
  companySlug: string;
  items: SerializedItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: Filters;
};

const STATUS_LABELS: Record<string, string> = {
  ALL: "Todos",
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  RESCHEDULED: "Reagendado",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge badge-warning",
  CONFIRMED: "badge badge-primary",
  IN_PROGRESS: "badge badge-primary",
  COMPLETED: "badge badge-success",
  CANCELLED: "badge badge-danger",
  RESCHEDULED: "badge badge-warning",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "text-[var(--color-warning)]",
  PAID: "text-[var(--color-success)]",
  FAILED: "text-[var(--color-danger)]",
  REFUNDED: "text-[var(--color-text-subtle)]",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Reembolsado",
};

const STATUS_TABS: (BookingStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export function AgendamentosClient({
  companySlug,
  items,
  total,
  page,
  pageCount,
  filters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const company = useCompany();

  function buildUrl(updates: Partial<Filters> & { page?: number }) {
    const params = new URLSearchParams();
    const merged = { ...filters, ...updates };
    if (merged.status && merged.status !== "ALL") params.set("status", merged.status);
    if (merged.from) params.set("from", merged.from);
    if (merged.to) params.set("to", merged.to);
    if (merged.q) params.set("q", merged.q);
    if (updates.page && updates.page > 1) params.set("page", String(updates.page));
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    router.push(buildUrl({ q: (fd.get("q") as string) ?? "", page: 1 }));
  }

  function handleDateSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    router.push(
      buildUrl({
        from: (fd.get("from") as string) ?? "",
        to: (fd.get("to") as string) ?? "",
        page: 1,
      })
    );
  }

  return (
    <div className="page-container">
     <div className="page-content space-y-4">
      {/* Page header */}
      <div className="page-header !mb-0 flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Agendamentos</h1>
          <p className="page-description">{total} agendamento{total !== 1 ? "s" : ""} no total</p>
        </div>
        <a
          href={`/api/export/bookings?slug=${companySlug}${filters.status && filters.status !== "ALL" ? `&status=${filters.status}` : ""}${filters.from ? `&from=${filters.from}` : ""}${filters.to ? `&to=${filters.to}` : ""}`}
          className="btn btn-secondary shrink-0"
          download
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar CSV
        </a>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="card card-body space-y-3">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filtrar por status">
            {STATUS_TABS.map((s) => (
              <Link
                key={s}
                href={buildUrl({ status: s, page: 1 })}
                role="tab"
                aria-selected={filters.status === s}
                className={filters.status === s ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              >
                {STATUS_LABELS[s]}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Buscar por cliente…"
                className="input !w-52"
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                Buscar
              </button>
            </form>

            {/* Date range */}
            <form onSubmit={handleDateSubmit} className="flex gap-2 items-center">
              <input
                name="from"
                type="date"
                defaultValue={filters.from}
                className="input !w-auto"
                aria-label="Data inicial"
              />
              <span className="text-[var(--color-text-subtle)] text-sm">–</span>
              <input
                name="to"
                type="date"
                defaultValue={filters.to}
                className="input !w-auto"
                aria-label="Data final"
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                Filtrar
              </button>
              {(filters.from || filters.to) && (
                <Link
                  href={buildUrl({ from: "", to: "", page: 1 })}
                  className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
                >
                  Limpar
                </Link>
              )}
            </form>
          </div>
        </div>

        {/* Table */}
        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[var(--color-text-muted)] text-sm">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col">Serviço</th>
                    <th scope="col">Data / Hora</th>
                    <th scope="col">Status</th>
                    <th scope="col">Pagamento</th>
                    <th scope="col" className="!text-right">Total</th>
                    <th scope="col"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-medium text-[var(--color-text-heading)]">
                          {item.customerName ?? "—"}
                        </p>
                        {item.customerEmail && (
                          <p className="text-xs text-[var(--color-text-subtle)]">{item.customerEmail}</p>
                        )}
                      </td>
                      <td>
                        <p className="text-[var(--color-text)] line-clamp-1">
                          {item.serviceLabels[0] ?? "—"}
                        </p>
                        {item.serviceLabels.length > 1 && (
                          <p className="text-xs text-[var(--color-text-subtle)]">
                            +{item.serviceLabels.length - 1} mais
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        <p className="text-[var(--color-text-heading)]">
                          {item.scheduledDate.split("-").reverse().join("/")}
                        </p>
                        <p className="text-xs text-[var(--color-text-subtle)]">
                          {item.scheduledStartTime} – {item.scheduledEndTime}
                        </p>
                      </td>
                      <td>
                        <span className={STATUS_COLORS[item.status] ?? "badge"}>
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </td>
                      <td>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {item.paymentMethod === "CARD" ? "Cartão" : "Dinheiro/Cheque"}
                        </p>
                        <p className={`text-xs font-medium ${PAYMENT_STATUS_COLORS[item.paymentStatus] ?? "text-[var(--color-text-muted)]"}`}>
                          {PAYMENT_STATUS_LABELS[item.paymentStatus] ?? item.paymentStatus}
                        </p>
                      </td>
                      <td className="!text-right whitespace-nowrap">
                        <span className="font-semibold text-[var(--color-text-heading)]">
                          {formatMoney(Number(item.estimateTotal), company.currency, company.locale)}
                        </span>
                      </td>
                      <td className="!text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {item.customerPhone && (
                            <a
                              href={`https://wa.me/${item.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                `Olá ${item.customerName || ""}! Confirmamos o seu agendamento para ${item.scheduledDate.split("-").reverse().join("/")} às ${item.scheduledStartTime}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-success)] hover:opacity-80 bg-[var(--color-success-light)] border border-[var(--color-success-border)] px-2.5 py-1 rounded-lg transition-all"
                              title="Enviar mensagem via WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          <Link
                            href={`/${company.slug}/agendamentos/${item.id}`}
                            className="btn btn-outline btn-sm"
                          >
                            Detalhes
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="border-t border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Página {page} de {pageCount}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={buildUrl({ page: page - 1 })} className="btn btn-outline btn-sm">
                      Anterior
                    </Link>
                  )}
                  {page < pageCount && (
                    <Link href={buildUrl({ page: page + 1 })} className="btn btn-outline btn-sm">
                      Próxima
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
     </div>
    </div>
  );
}
