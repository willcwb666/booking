"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  banUserAction,
  unbanUserAction,
  toggleUserAdminAction,
} from "@/server/actions/admin";
import type { AdminUserItem, AdminUserFilter } from "@/server/queries/admin";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconAction, RowActions } from "@/components/ui/icon-action";
import { toast } from "@/lib/toast-service";
import { Users, Search, X } from "@/components/ui/icons";

type SerializedItem = Omit<AdminUserItem, "createdAt"> & { createdAt: string };

const FILTERS: { id: AdminUserFilter; label: string }[] = [
  { id: "ALL", label: "Todos" },
  { id: "ADMIN", label: "Super admins" },
  { id: "BANNED", label: "Banidos" },
];

export function AdminUsersClient({
  items,
  total,
  page,
  pageSize = 10,
  search,
  filter,
}: {
  items: SerializedItem[];
  total: number;
  page: number;
  pageSize?: number;
  pageCount: number;
  search: string;
  filter: AdminUserFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [searchDraft, setSearchDraft] = useState(search);
  const [banTarget, setBanTarget] = useState<SerializedItem | null>(null);
  const [banReason, setBanReason] = useState("");
  const [unbanTarget, setUnbanTarget] = useState<SerializedItem | null>(null);
  const [roleTarget, setRoleTarget] = useState<SerializedItem | null>(null);

  function buildUrl(patch: {
    q?: string;
    page?: number;
    pageSize?: number;
    filter?: AdminUserFilter;
  }) {
    const params = new URLSearchParams();
    const q = patch.q ?? search;
    const f = patch.filter ?? filter;
    const p = patch.page ?? page;
    const ps = patch.pageSize ?? pageSize;
    if (q) params.set("q", q);
    if (f !== "ALL") params.set("filter", f);
    if (p > 1) params.set("page", String(p));
    if (ps !== 10) params.set("pageSize", String(ps));
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function go(patch: Parameters<typeof buildUrl>[0]) {
    startTransition(() =>
      router.push(buildUrl({ page: 1, ...patch }), { scroll: false })
    );
  }

  function handleBan() {
    if (!banTarget) return;
    const target = banTarget;
    startTransition(async () => {
      const result = await banUserAction(target.id, banReason);
      if (!result.success) {
        toast.error("Não foi possível banir", result.error);
        return;
      }
      toast.success("Usuário banido", target.email);
      setBanTarget(null);
      setBanReason("");
      router.refresh();
    });
  }

  function handleUnban() {
    if (!unbanTarget) return;
    const target = unbanTarget;
    startTransition(async () => {
      const result = await unbanUserAction(target.id);
      if (!result.success) {
        toast.error("Não foi possível desbanir", result.error);
        return;
      }
      toast.success("Usuário reativado", target.email);
      setUnbanTarget(null);
      router.refresh();
    });
  }

  function handleToggleAdmin() {
    if (!roleTarget) return;
    const target = roleTarget;
    startTransition(async () => {
      const result = await toggleUserAdminAction(target.id);
      if (!result.success) {
        toast.error("Não foi possível alterar", result.error);
        return;
      }
      toast.success(
        target.role === "admin"
          ? "Privilégios removidos"
          : "Promovido a super admin",
        target.email
      );
      setRoleTarget(null);
      router.refresh();
    });
  }

  const hasActiveFilter = Boolean(search) || filter !== "ALL";

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Plataforma"
        categoryIcon={<Users className="w-3.5 h-3.5" />}
        title="Usuários"
        description="Todas as contas da plataforma. Banir corta o acesso imediatamente; super admin dá acesso a tudo."
        action={
          <span className="eyebrow">
            {total} {total === 1 ? "usuário" : "usuários"}
          </span>
        }
      />

      <div className="scroller -mx-1 px-1">
        <div className="segmented w-max" role="tablist" aria-label="Filtrar usuários">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              data-active={filter === f.id}
              onClick={() => go({ filter: f.id })}
              className="segmented-item whitespace-nowrap"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar" data-pending={isPending || undefined}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: searchDraft.trim() });
          }}
          className="relative max-w-xs w-full"
          role="search"
        >
          <Search className="w-4 h-4 text-[var(--color-text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Nome ou e-mail"
            aria-label="Buscar usuário"
            className="input pl-9"
          />
        </form>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              setSearchDraft("");
              startTransition(() => router.push(pathname, { scroll: false }));
            }}
            className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}

        <span className="toolbar-spacer" />
      </div>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Users className="w-5 h-5" />}
            title={
              hasActiveFilter
                ? "Nenhum usuário com esses filtros"
                : "Nenhum usuário cadastrado"
            }
            description={
              hasActiveFilter
                ? "Nenhuma conta em toda a base corresponde à busca ou ao filtro."
                : "As contas aparecem aqui conforme as pessoas se cadastram."
            }
            action={
              hasActiveFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft("");
                    router.push(pathname);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Limpar filtros
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div
            className="table-container"
            style={{ border: 0, borderRadius: 0, boxShadow: "none" }}
          >
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Usuário</th>
                  <th scope="col" className="text-right">
                    Empresas
                  </th>
                  <th scope="col">Perfil</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium text-[var(--color-text-heading)]">
                        {item.name}
                      </p>
                      <p
                        className="text-[var(--color-text-subtle)]"
                        style={{ fontSize: "var(--text-xs)" }}
                      >
                        {item.email}
                      </p>
                    </td>
                    <td data-type="number">{item.companyCount}</td>
                    <td>
                      {item.role === "admin" ? (
                        <StatusBadge variant="primary">Super admin</StatusBadge>
                      ) : (
                        <span className="text-[var(--color-text-subtle)]">
                          Usuário
                        </span>
                      )}
                    </td>
                    <td>
                      {item.banned ? (
                        <StatusBadge
                          variant="danger"
                          tooltip={item.banReason || undefined}
                        >
                          Banido
                        </StatusBadge>
                      ) : (
                        <StatusBadge variant="success">Ativo</StatusBadge>
                      )}
                    </td>
                    <td>
                      <RowActions>
                        <IconAction
                          intent="promote"
                          label={
                            item.role === "admin"
                              ? `Remover privilégios de super admin de ${item.name}`
                              : `Promover ${item.name} a super admin`
                          }
                          pressed={item.role === "admin"}
                          onClick={() => setRoleTarget(item)}
                          pending={isPending}
                        />
                        {item.banned ? (
                          <IconAction
                            intent="unblock"
                            label={`Reativar ${item.name}`}
                            onClick={() => setUnbanTarget(item)}
                            pending={isPending}
                          />
                        ) : (
                          <IconAction
                            intent="block"
                            label={`Banir ${item.name}`}
                            onClick={() => {
                              setBanReason("");
                              setBanTarget(item);
                            }}
                            pending={isPending}
                          />
                        )}
                      </RowActions>
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
            onPageSizeChange={(newSize) =>
              router.push(buildUrl({ page: 1, pageSize: newSize }))
            }
            itemLabel="usuários"
          />
        </div>
      )}

      {/* Banir usa o Modal do sistema (foco preso, Escape, restauração de
          foco) em vez de um <dialog> cru com estilo próprio. */}
      {banTarget && (
        <Modal
          isOpen={Boolean(banTarget)}
          onClose={() => setBanTarget(null)}
          title={`Banir ${banTarget.name}`}
        >
          <div className="space-y-4">
            <p
              className="text-[var(--color-text-muted)]"
              style={{ fontSize: "var(--text-sm)" }}
            >
              O acesso é cortado imediatamente, em todas as empresas. O motivo
              fica registrado e aparece no status do usuário.
            </p>

            <div className="field">
              <label className="input-label" htmlFor="ban-reason">
                Motivo (opcional)
              </label>
              <textarea
                id="ban-reason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
                className="input resize-y"
                placeholder="Ex.: uso indevido confirmado em 12/08"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBanTarget(null)}
                className="btn btn-outline btn-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBan}
                disabled={isPending}
                className="btn btn-destructive btn-sm"
              >
                {isPending ? "Banindo…" : "Banir usuário"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {unbanTarget && (
        <ConfirmDialog
          isOpen={Boolean(unbanTarget)}
          onClose={() => setUnbanTarget(null)}
          onConfirm={handleUnban}
          title="Reativar usuário"
          description={`${unbanTarget.name} volta a ter acesso ao sistema.`}
          variant="success"
          confirmText="Reativar"
          isLoading={isPending}
        />
      )}

      {/* Promover a super admin dá acesso a toda a plataforma e a todas as
          empresas. Acontecia em um clique, sem confirmação. */}
      {roleTarget && (
        <ConfirmDialog
          isOpen={Boolean(roleTarget)}
          onClose={() => setRoleTarget(null)}
          onConfirm={handleToggleAdmin}
          title={
            roleTarget.role === "admin"
              ? "Remover privilégios de super admin"
              : "Promover a super admin"
          }
          description={
            roleTarget.role === "admin"
              ? `${roleTarget.name} deixa de administrar a plataforma e volta a ser um usuário comum.`
              : `${roleTarget.name} passa a ver e alterar os dados de TODAS as empresas da plataforma, incluindo faturamento e permissões de outros administradores.`
          }
          variant={roleTarget.role === "admin" ? "warning" : "danger"}
          confirmText={roleTarget.role === "admin" ? "Remover" : "Promover"}
          isLoading={isPending}
        />
      )}
    </div>
  );
}
