"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTransition, useState, useRef } from "react";
import { banUserAction, unbanUserAction, toggleUserAdminAction } from "@/server/actions/admin";
import type { AdminUserItem } from "@/server/queries/admin";

type SerializedItem = Omit<AdminUserItem, "createdAt"> & { createdAt: string };

function BanDialog({ userId, onDone }: { userId: string; onDone: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const reason = (fd.get("reason") as string) ?? "";
    startTransition(async () => {
      const result = await banUserAction(userId, reason);
      if (!result.success) {
        setError(result.error);
        return;
      }
      close();
      onDone();
    });
  }

  return (
    <>
      <button
        onClick={open}
        className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
      >
        Banir
      </button>
      <dialog
        ref={dialogRef}
        onClick={(e) => { if (e.target === dialogRef.current) close(); }}
        className="rounded-xl border border-gray-200 shadow-xl p-0 backdrop:bg-black/40 max-w-sm w-full"
      >
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Banir usuário</h2>
          </div>
          <div className="px-5 py-4">
            <label className="block text-xs text-gray-600 mb-1.5" htmlFor="ban-reason">
              Motivo (opcional)
            </label>
            <textarea
              id="ban-reason"
              name="reason"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            {error && <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
            <button type="button" onClick={close} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "…" : "Confirmar"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function UserActions({ item, onDone }: { item: SerializedItem; onDone: () => void }) {
  const [unbanPending, startUnbanTransition] = useTransition();
  const [adminPending, startAdminTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUnban() {
    startUnbanTransition(async () => {
      const result = await unbanUserAction(item.id);
      if (!result.success) { setError(result.error); return; }
      onDone();
    });
  }

  function handleToggleAdmin() {
    startAdminTransition(async () => {
      const result = await toggleUserAdminAction(item.id);
      if (!result.success) { setError(result.error); return; }
      onDone();
    });
  }

  return (
    <div className="flex gap-2 items-center justify-end flex-wrap">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {item.banned ? (
        <button
          onClick={handleUnban}
          disabled={unbanPending}
          className="px-3 py-1 text-xs border border-green-200 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 transition-colors font-medium"
        >
          {unbanPending ? "…" : "Desbanir"}
        </button>
      ) : (
        <BanDialog userId={item.id} onDone={onDone} />
      )}
      <button
        onClick={handleToggleAdmin}
        disabled={adminPending}
        className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
      >
        {adminPending ? "…" : item.role === "admin" ? "Remover admin" : "Tornar admin"}
      </button>
    </div>
  );
}

export function AdminUsersClient({
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
        <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} usuário{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <form onSubmit={handleSearch} className="flex gap-2 mb-5">
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por nome ou e-mail…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
          />
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
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
            <p className="text-gray-500 text-sm">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuário</th>
                    <th scope="col" className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Empresas</th>
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.email}</p>
                      </td>
                      <td className="px-5 py-3 text-center text-gray-700">{item.companyCount}</td>
                      <td className="px-5 py-3">
                        {item.role === "admin" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Admin
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Usuário</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {item.banned ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Banido
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <UserActions item={item} onDone={() => router.refresh()} />
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
