"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTransition, useState } from "react";
import { toggleCompanyActiveAction } from "@/server/actions/admin";
import type { AdminCompanyItem } from "@/server/queries/admin";

type SerializedItem = Omit<AdminCompanyItem, "createdAt"> & { createdAt: string };

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  HOME_CLEANING: "Limpeza residencial",
  PET_GROOMER: "Pet groomer",
  CAR_WASH: "Lava-rápido",
  POOL_CLEANING: "Limpeza de piscina",
  LAWN_CARE: "Jardinagem",
  BARBER: "Barbearia",
  HAIR_SALON: "Salão de beleza",
  PHOTOGRAPHER: "Fotógrafo",
  OTHER: "Outro",
};

function ToggleActiveButton({
  companyId,
  isActive,
}: {
  companyId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleCompanyActiveAction(companyId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        onClick={handleToggle}
        disabled={pending}
        className={[
          "px-3 py-1 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50",
          isActive
            ? "border-red-200 text-red-600 hover:bg-red-50"
            : "border-green-200 text-green-700 hover:bg-green-50",
        ].join(" ")}
      >
        {pending ? "…" : isActive ? "Desativar" : "Ativar"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export function AdminCompaniesClient({
  items,
  total,
  page,
  pageCount,
  search,
}: {
  items: SerializedItem[];
  total: number;
  page: number;
  pageCount: number;
  search: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function buildUrl(updates: { q?: string; page?: number }) {
    const params = new URLSearchParams();
    const q = updates.q ?? search;
    const p = updates.page ?? page;
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    router.push(buildUrl({ q: (fd.get("q") as string) ?? "", page: 1 }));
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-8 py-5 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Empresas</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} empresa{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-5">
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por nome ou slug…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            Buscar
          </button>
          {search && (
            <Link href={pathname} className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600">
              Limpar
            </Link>
          )}
        </form>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-sm">Nenhuma empresa encontrada.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresa</th>
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plano</th>
                    <th scope="col" className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Membros</th>
                    <th scope="col" className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Agendamentos</th>
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">/{item.slug}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {BUSINESS_TYPE_LABELS[item.businessType] ?? item.businessType}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{item.planName}</td>
                      <td className="px-5 py-3 text-center text-gray-700">{item.memberCount}</td>
                      <td className="px-5 py-3 text-center text-gray-700">{item.bookingCount}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.isActive ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <ToggleActiveButton companyId={item.id} isActive={item.isActive} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">Página {page} de {pageCount}</p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={buildUrl({ page: page - 1 })} className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      Anterior
                    </Link>
                  )}
                  {page < pageCount && (
                    <Link href={buildUrl({ page: page + 1 })} className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
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
