"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTransition, useState, useRef } from "react";
import { banUserAction, unbanUserAction, toggleUserAdminAction } from "@/server/actions/admin";
import type { AdminUserItem } from "@/server/queries/admin";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { StatusBadge } from "@/components/ui/status-badge";
import { Ban, CheckCircle2, Shield } from "@/components/ui/icons";

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
      <ActionTooltip label="Banir Usuário">
        <button
          onClick={open}
          className="p-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium cursor-pointer inline-flex items-center justify-center"
        >
          <Ban className="w-4 h-4" />
        </button>
      </ActionTooltip>
      <dialog
        ref={dialogRef}
        onClick={(e) => { if (e.target === dialogRef.current) close(); }}
        className="rounded-xl border border-[var(--color-border)] shadow-xl p-0 backdrop:bg-black/40 max-w-sm w-full"
      >
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)]">Banir usuário</h2>
          </div>
          <div className="px-5 py-4">
            <label className="block text-xs text-[var(--color-text-muted)] mb-1.5" htmlFor="ban-reason">
              Motivo (opcional)
            </label>
            <textarea
              id="ban-reason"
              name="reason"
              rows={3}
              className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            {error && <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
          <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-2 justify-end">
            <button type="button" onClick={close} className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-subtle)]">
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
        <ActionTooltip label="Desbanir Usuário">
          <button
            onClick={handleUnban}
            disabled={unbanPending}
            className="p-2 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors font-medium inline-flex items-center justify-center cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </ActionTooltip>
      ) : (
        <BanDialog userId={item.id} onDone={onDone} />
      )}
      <ActionTooltip label={item.role === "admin" ? "Remover Privilégios de Admin" : "Promover a Super Admin"}>
        <button
          onClick={handleToggleAdmin}
          disabled={adminPending}
          className={`p-2 border rounded-lg transition-colors font-medium inline-flex items-center justify-center cursor-pointer disabled:opacity-50 ${
            item.role === "admin"
              ? "border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              : "border-slate-200 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Shield className="w-4 h-4" />
        </button>
      </ActionTooltip>
    </div>
  );
}

import { Pagination } from "@/components/ui/pagination";

export function AdminUsersClient({
  items,
  total,
  page,
  pageSize = 10,
  pageCount,
  search,
}: {
  items: SerializedItem[];
  total: number;
  page: number;
  pageSize?: number;
  pageCount: number;
  search: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function buildUrl(updates: { q?: string; page?: number; pageSize?: number }) {
    const params = new URLSearchParams();
    const q = updates.q ?? search;
    const p = updates.page ?? page;
    const ps = updates.pageSize ?? pageSize;
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    if (ps && ps !== 10) params.set("pageSize", String(ps));
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    router.push(buildUrl({ q: (fd.get("q") as string) ?? "", page: 1 }));
  }

  return (
    <div className="page-content space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--color-text-heading)] tracking-tight">Usuários Registrados</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">{total} usuário{total !== 1 ? "s" : ""} cadastrado(s) na plataforma</p>
      </div>

      <div className="bg-white rounded-3xl border border-[var(--color-border)]/80 p-5 shadow-2xs">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full">
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por nome ou e-mail..."
            className="border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            Buscar
          </button>
          {search && (
            <Link href={pathname} className="px-3 py-2.5 text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] flex items-center">
              Limpar
            </Link>
          )}
        </form>
      </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center">
            <p className="text-[var(--color-text-muted)] text-sm">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Usuário</th>
                    <th scope="col" className="text-center px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Empresas</th>
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Role</th>
                    <th scope="col" className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Status</th>
                    <th scope="col" className="px-5 py-3 text-right"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-[var(--color-text-heading)]">{item.name}</p>
                        <p className="text-xs text-[var(--color-text-subtle)]">{item.email}</p>
                      </td>
                      <td className="px-5 py-3 text-center text-[var(--color-text)]">{item.companyCount}</td>
                      <td className="px-5 py-3">
                        {item.role === "admin" ? (
                          <StatusBadge variant="secondary" tooltip="Super Admin da Plataforma">
                            Admin
                          </StatusBadge>
                        ) : (
                          <span className="text-[var(--color-text-subtle)] text-xs font-medium">Usuário</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {item.banned ? (
                          <StatusBadge variant="danger" tooltip="Usuário Banido">
                            Banido
                          </StatusBadge>
                        ) : (
                          <StatusBadge variant="success" tooltip="Usuário Ativo">
                            Ativo
                          </StatusBadge>
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

            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30, 50, 100]}
              onPageChange={(newPage) => router.push(buildUrl({ page: newPage }))}
              onPageSizeChange={(newSize) => router.push(buildUrl({ page: 1, pageSize: newSize }))}
              itemLabel="usuários"
            />
          </div>
        )}
    </div>
  );
}
