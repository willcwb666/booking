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
  OWNER: "bg-purple-100 text-purple-800",
  MANAGER: "bg-blue-100 text-blue-800",
  EMPLOYEE: "bg-gray-100 text-gray-700",
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
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="E-mail do membro a convidar"
      />
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
      >
        {pending ? "Convidando…" : "Convidar"}
      </button>
      {error && <p role="alert" className="text-sm text-red-600 self-center">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700 self-center">Membro adicionado!</p>}
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
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="MANAGER">Gerente</option>
        <option value="EMPLOYEE">Funcionário</option>
      </select>
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
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
        className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        aria-label={`Remover ${member.name} da equipe`}
      >
        {pending ? "…" : "Remover"}
      </button>
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
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
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Equipe</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {active.length} membro{active.length !== 1 ? "s" : ""} ativo{active.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-w-3xl">
        {/* Invite */}
        {canInvite && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Convidar membro</h2>
            <p className="text-xs text-gray-500 mb-3">
              O usuário precisa ter uma conta cadastrada na plataforma.
              Ao convidar, ele entra com o role de Funcionário.
            </p>
            <InviteForm companySlug={companySlug} onDone={refresh} />
          </div>
        )}

        {/* Active members */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Membros ativos
            </h2>
          </div>
          {active.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400 text-center">
              Nenhum membro ativo.
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
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
                        className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        <span className="text-sm font-bold text-blue-600">
                          {member.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.name}
                          {isSelf && (
                            <span className="ml-1.5 text-xs text-gray-400">(você)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{member.email}</p>
                      </div>
                    </div>

                    {/* Role + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {canEditRole ? (
                        <RoleSelect companySlug={companySlug} member={member} onDone={refresh} />
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] ?? "bg-gray-100 text-gray-600"}`}
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Membros removidos
              </h2>
            </div>
            <ul className="divide-y divide-gray-50">
              {inactive.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 opacity-60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0" aria-hidden="true">
                      <span className="text-sm font-bold text-gray-400">
                        {member.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-500 truncate">{member.name}</p>
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">Inativo</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
