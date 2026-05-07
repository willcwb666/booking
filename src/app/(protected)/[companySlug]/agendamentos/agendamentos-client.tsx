"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
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
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RESCHEDULED: "bg-orange-100 text-orange-800",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-700",
  PAID: "text-green-700",
  FAILED: "text-red-700",
  REFUNDED: "text-gray-500",
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
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Page header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Agendamentos</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} agendamento{total !== 1 ? "s" : ""} no total</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filtrar por status">
            {STATUS_TABS.map((s) => (
              <Link
                key={s}
                href={buildUrl({ status: s, page: 1 })}
                role="tab"
                aria-selected={filters.status === s}
                className={[
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filters.status === s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                ].join(" ")}
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
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                Buscar
              </button>
            </form>

            {/* Date range */}
            <form onSubmit={handleDateSubmit} className="flex gap-2 items-center">
              <input
                name="from"
                type="date"
                defaultValue={filters.from}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Data inicial"
              />
              <span className="text-gray-400 text-sm">–</span>
              <input
                name="to"
                type="date"
                defaultValue={filters.to}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Data final"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                Filtrar
              </button>
              {(filters.from || filters.to) && (
                <Link
                  href={buildUrl({ from: "", to: "", page: 1 })}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Limpar
                </Link>
              )}
            </form>
          </div>
        </div>

        {/* Table */}
        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-sm">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Cliente
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Serviço
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Data / Hora
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Pagamento
                    </th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Total
                    </th>
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {item.customerName ?? "—"}
                        </p>
                        {item.customerEmail && (
                          <p className="text-xs text-gray-400">{item.customerEmail}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700 line-clamp-1">
                          {item.serviceLabels[0] ?? "—"}
                        </p>
                        {item.serviceLabels.length > 1 && (
                          <p className="text-xs text-gray-400">
                            +{item.serviceLabels.length - 1} mais
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-gray-900">
                          {item.scheduledDate.split("-").reverse().join("/")}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.scheduledStartTime} – {item.scheduledEndTime}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500">
                          {item.paymentMethod === "CARD" ? "Cartão" : "Dinheiro/Cheque"}
                        </p>
                        <p
                          className={`text-xs font-medium ${PAYMENT_STATUS_COLORS[item.paymentStatus] ?? "text-gray-500"}`}
                        >
                          {PAYMENT_STATUS_LABELS[item.paymentStatus] ?? item.paymentStatus}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          {Number(item.estimateTotal).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/${companySlug}/agendamentos/${item.id}`}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Página {page} de {pageCount}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={buildUrl({ page: page - 1 })}
                      className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Anterior
                    </Link>
                  )}
                  {page < pageCount && (
                    <Link
                      href={buildUrl({ page: page + 1 })}
                      className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
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
  );
}
