"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { inviteMemberAction, changeRoleAction, removeMemberAction } from "@/server/actions/team";
import type { TeamMember } from "@/server/queries/team";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextInput } from "@/components/forms/form-elements";
import { Users, UserPlus, Trash2 } from "@/components/ui/icons";
import { toast } from "@/lib/toast-service";

type SerializedMember = Omit<TeamMember, "joinedAt"> & { joinedAt: string };

type Props = {
  companySlug: string;
  members: SerializedMember[];
  currentUserId: string;
  currentUserRole: string;
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gerente",
  EMPLOYEE: "Funcionário",
};

const ROLE_VARIANTS: Record<string, "primary" | "secondary" | "neutral"> = {
  OWNER: "primary",
  MANAGER: "secondary",
  EMPLOYEE: "neutral",
};

function InviteForm({
  companySlug,
  onDone,
}: {
  companySlug: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = inputRef.current?.value.trim() ?? "";
    if (!email) return;

    startTransition(async () => {
      const result = await inviteMemberAction(companySlug, email);
      if (!result.success) {
        toast.error("Erro ao convidar", result.error);
        return;
      }
      toast.success("Membro convidado!", `O convite foi enviado para ${email}.`);
      if (inputRef.current) inputRef.current.value = "";
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <TextInput
        ref={inputRef}
        type="email"
        required
        placeholder="E-mail do novo membro…"
        className="flex-1"
        aria-label="E-mail do membro a convidar"
      />
      <button
        type="submit"
        disabled={pending}
        className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white text-xs font-bold rounded-[var(--radius-control)] transition-all disabled:opacity-50 cursor-pointer shrink-0 inline-flex items-center justify-center gap-2"
      >
        <UserPlus className="w-4 h-4" />
        <span>{pending ? "Convidando…" : "Convidar"}</span>
      </button>
    </form>
  );
}

function RoleSelect({
  companySlug,
  member,
  onDone,
}: {
  companySlug: string;
  member: SerializedMember;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as "MANAGER" | "EMPLOYEE";
    startTransition(async () => {
      const result = await changeRoleAction(companySlug, member.id, newRole);
      if (!result.success) {
        toast.error("Falha ao alterar perfil", result.error);
        return;
      }
      toast.success("Perfil atualizado!", `Permissão de ${member.name} alterada para ${ROLE_LABELS[newRole]}.`);
      onDone();
    });
  }

  return (
    <select
      value={member.role}
      onChange={handleChange}
      disabled={pending}
      aria-label={`Role de ${member.name}`}
      className="text-xs border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-1.5 font-bold text-[var(--color-text)] bg-[var(--color-bg)] focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
    >
      <option value="MANAGER">Gerente</option>
      <option value="EMPLOYEE">Funcionário</option>
    </select>
  );
}

export function EquipeClient({ companySlug, members, currentUserId, currentUserRole }: Props) {
  const router = useRouter();
  const isOwner = currentUserRole === "OWNER";
  const canInvite = currentUserRole === "OWNER" || currentUserRole === "MANAGER";

  const active = members.filter((m) => m.isActive);
  const inactive = members.filter((m) => !m.isActive);

  // ConfirmDialog State
  const [memberToRemove, setMemberToRemove] = useState<SerializedMember | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();

  function refresh() { router.refresh(); }

  function handleConfirmRemove() {
    if (!memberToRemove) return;

    startRemoveTransition(async () => {
      const result = await removeMemberAction(companySlug, memberToRemove.id);
      if (!result.success) {
        toast.error("Erro ao remover", result.error);
        return;
      }
      toast.success("Membro removido!", `${memberToRemove.name} foi removido da equipe com sucesso.`);
      setMemberToRemove(null);
      refresh();
    });
  }

  return (
    <div className="w-full max-w-7xl px-6 sm:px-10 py-8 text-left space-y-8 pb-32">
      <PageHeader
        category="Gestão de Acessos"
        categoryIcon={<Users className="w-4 h-4" />}
        title="Equipe da Empresa"
        description={`${active.length} membro${active.length !== 1 ? "s" : ""} ativo${active.length !== 1 ? "s" : ""} no sistema.`}
      />

      <div className="space-y-6">
        {/* Convidar membro */}
        {canInvite && (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-4 shadow-xs">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-heading)]">Convidar novo membro</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                O usuário precisa ter uma conta cadastrada no sistema. Ao convidar, ele ingressa como Funcionário.
              </p>
            </div>
            <InviteForm companySlug={companySlug} onDone={refresh} />
          </div>
        )}

        {/* Membros ativos */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
            <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              Membros Ativos ({active.length})
            </h2>
          </div>

          {active.length === 0 ? (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title="Nenhum membro ativo"
              description="Sua equipe ainda não possui membros ativos."
            />
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {active.map((member) => {
                const isSelf = member.userId === currentUserId;
                const canEditRole = isOwner && !isSelf && member.role !== "OWNER";
                const canRemove = isOwner && !isSelf && member.role !== "OWNER";

                return (
                  <li
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-[var(--color-bg-subtle)] transition-colors"
                  >
                    {/* Avatar + Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] border border-[var(--color-primary)] flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        <span className="text-sm font-semibold text-[var(--color-primary)]">
                          {member.name[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[var(--color-text-heading)] truncate">
                          {member.name}
                          {isSelf && (
                            <span className="ml-2 text-xs text-[var(--color-primary)] font-semibold bg-[var(--color-primary-light)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                              você
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">{member.email}</p>
                      </div>
                    </div>

                    {/* Role + Actions */}
                    <div className="flex items-center gap-3 shrink-0 justify-end">
                      {canEditRole ? (
                        <RoleSelect companySlug={companySlug} member={member} onDone={refresh} />
                      ) : (
                        <StatusBadge variant={ROLE_VARIANTS[member.role] ?? "neutral"}>
                          {ROLE_LABELS[member.role] ?? member.role}
                        </StatusBadge>
                      )}

                      {canRemove && (
                        <ActionTooltip label={`Remover ${member.name}`}>
                          <button
                            type="button"
                            onClick={() => setMemberToRemove(member)}
                            className="p-2 text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-[var(--radius-control)] transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </ActionTooltip>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Membros inativos */}
        {inactive.length > 0 && (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] overflow-hidden shadow-xs opacity-75">
            <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
              <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Membros Removidos ({inactive.length})
              </h2>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {inactive.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 opacity-60"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[var(--color-text-muted)]">
                        {member.name[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{member.name}</p>
                      <p className="text-xs text-[var(--color-text-subtle)] truncate">{member.email}</p>
                    </div>
                  </div>
                  <StatusBadge variant="neutral">Inativo</StatusBadge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ConfirmDialog de Remoção de Membro */}
      {memberToRemove && (
        <ConfirmDialog
          isOpen={Boolean(memberToRemove)}
          onClose={() => setMemberToRemove(null)}
          onConfirm={handleConfirmRemove}
          title="Remover Membro"
          description={`Tem certeza que deseja remover ${memberToRemove.name} (${memberToRemove.email}) da equipe da empresa? Ele perderá o acesso ao painel.`}
          confirmText="Remover Membro"
          variant="danger"
          isLoading={isRemoving}
        />
      )}
    </div>
  );
}
