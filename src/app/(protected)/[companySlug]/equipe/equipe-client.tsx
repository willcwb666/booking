"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { inviteMemberAction, changeRoleAction, removeMemberAction } from "@/server/actions/team";
import type { TeamMember } from "@/server/queries/team";

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

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
  MANAGER: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
  EMPLOYEE: "bg-[var(--color-bg-muted)] text-[var(--color-text-heading)]",
};

function InviteForm({
  companySlug,
  onDone,
}: {
  companySlug: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = inputRef.current?.value.trim() ?? "";
    if (!email) return;
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await inviteMemberAction(companySlug, email);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      if (inputRef.current) inputRef.current.value = "";
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <input
        ref={inputRef}
        type="email"
        required
        placeholder="E-mail do novo membro…"
        className="flex-1 border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        aria-label="E-mail do membro a convidar"
      />
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors shrink-0"
      >
        {pending ? "Convidando…" : "Convidar"}
      </button>
      {error && <p role="alert" className="text-sm text-[var(--color-danger)] self-center">{error}</p>}
      {success && <p role="status" className="text-sm text-[var(--color-success)] self-center">Membro adicionado!</p>}
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
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as "MANAGER" | "EMPLOYEE";
    startTransition(async () => {
      const result = await changeRoleAction(companySlug, member.id, newRole);
      if (!result.success) { setError(result.error); return; }
      onDone();
    });
  }

  return (
    <div>
      <select
        value={member.role}
        onChange={handleChange}
        disabled={pending}
        aria-label={`Role de ${member.name}`}
        className="text-xs border border-[var(--color-border)] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
      >
        <option value="MANAGER">Gerente</option>
        <option value="EMPLOYEE">Funcionário</option>
      </select>
      {error && <p className="text-xs text-[var(--color-danger)] mt-0.5">{error}</p>}
    </div>
  );
}

function RemoveButton({
  companySlug,
  member,
  onDone,
}: {
  companySlug: string;
  member: SerializedMember;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRemove() {
    startTransition(async () => {
      const result = await removeMemberAction(companySlug, member.id);
      if (!result.success) { setError(result.error); return; }
      onDone();
    });
  }

  return (
    <div>
      <button
        onClick={handleRemove}
        disabled={pending}
        className="px-3 py-1 text-xs border border-[var(--color-danger-border)] text-[var(--color-danger)] rounded-lg hover:bg-[var(--color-danger-light)] disabled:opacity-50 transition-colors"
        aria-label={`Remover ${member.name} da equipe`}
      >
        {pending ? "…" : "Remover"}
      </button>
      {error && <p className="text-xs text-[var(--color-danger)] mt-0.5">{error}</p>}
    </div>
  );
}

export function EquipeClient({ companySlug, members, currentUserId, currentUserRole }: Props) {
  const router = useRouter();
  const isOwner = currentUserRole === "OWNER";
  const canInvite = currentUserRole === "OWNER" || currentUserRole === "MANAGER";

  const active = members.filter((m) => m.isActive);
  const inactive = members.filter((m) => !m.isActive);

  function refresh() { router.refresh(); }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-5 border-b border-[var(--color-border)] bg-white">
        <h1 className="text-xl font-bold text-[var(--color-text-heading)]">Equipe</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {active.length} membro{active.length !== 1 ? "s" : ""} ativo{active.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-3xl">
        {/* Invite */}
        {canInvite && (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-3">Convidar membro</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              O usuário precisa ter uma conta cadastrada na plataforma.
              Ao convidar, ele entra com o role de Funcionário.
            </p>
            <InviteForm companySlug={companySlug} onDone={refresh} />
          </div>
        )}

        {/* Active members */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Membros ativos
            </h2>
          </div>
          {active.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[var(--color-text-subtle)] text-center">
              Nenhum membro ativo.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {active.map((member) => {
                const isSelf = member.userId === currentUserId;
                const canEditRole = isOwner && !isSelf && member.role !== "OWNER";
                const canRemove = isOwner && !isSelf && member.role !== "OWNER";

                return (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        <span className="text-sm font-bold text-[var(--color-primary)]">
                          {member.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-heading)] truncate">
                          {member.name}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-[var(--color-text-subtle)]">(você)</span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--color-text-subtle)] truncate">{member.email}</p>
                      </div>
                    </div>

                    {/* Role + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {canEditRole ? (
                        <RoleSelect companySlug={companySlug} member={member} onDone={refresh} />
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] ?? "bg-[var(--color-bg-muted)] text-[var(--color-text)]"}`}
                        >
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>
                      )}
                      {canRemove && (
                        <RemoveButton companySlug={companySlug} member={member} onDone={refresh} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Inactive members */}
        {inactive.length > 0 && (
          <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
              <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                Membros removidos
              </h2>
            </div>
            <ul className="divide-y divide-[var(--color-border)]">
              {inactive.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 opacity-60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-bg-muted)] flex items-center justify-center shrink-0" aria-hidden="true">
                      <span className="text-sm font-bold text-[var(--color-text-subtle)]">
                        {member.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--color-text-muted)] truncate">{member.name}</p>
                      <p className="text-xs text-[var(--color-text-subtle)] truncate">{member.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--color-text-subtle)]">Inativo</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
