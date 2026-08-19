"use client";

import React, { useState, useTransition } from "react";
import {
  createCompanyRoleAction,
  deleteCompanyRoleAction,
  type CompanyRoleItem,
} from "@/server/actions/company-roles";
import { toast } from "@/lib/toast-service";
import { User, Plus, Trash } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  companyName: string;
  businessType: string;
  roles: CompanyRoleItem[];
};

export function CompanyCargosClient({ companySlug, roles: initialRoles }: Props) {
  const [rolesList, setRolesList] = useState<CompanyRoleItem[]>(initialRoles);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Atenção", "Informe o nome do cargo.");
      return;
    }

    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("name", name);
    fd.set("description", description);

    startTransition(async () => {
      const res = await createCompanyRoleAction(fd);
      if (res.success) {
        toast.success("Cadastrado!", "Cargo adicionado com sucesso.");
        setName("");
        setDescription("");
        window.location.reload();
      } else {
        toast.error("Erro", res.error || "Falha ao adicionar cargo.");
      }
    });
  }

  function handleDelete(roleId: string, roleName: string) {
    if (!confirm(`Deseja remover o cargo ${roleName}?`)) return;
    startTransition(async () => {
      const res = await deleteCompanyRoleAction(companySlug, roleId);
      if (res.success) {
        toast.success("Removido", "Cargo excluído com sucesso.");
        setRolesList(rolesList.filter((r) => r.id !== roleId));
      } else {
        toast.error("Erro", res.error || "Falha ao excluir.");
      }
    });
  }

  return (
    <div className="w-full max-w-6xl px-6 sm:px-10 py-8 text-left space-y-8 pb-32">
      <div>
        <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
          <User className="w-4 h-4" />
          <span>Gestão de Equipe & Catálogo</span>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-heading)] tracking-tight mt-1">
          Cargos & Especialidades
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Gerencie a lista de funções e especialidades atribuídas aos profissionais da empresa.
        </p>
      </div>

      {/* FORMULÁRIO DE ADIÇÃO DE NOVO CARGO */}
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-sm font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border)] pb-3">
          ADICIONAR NOVO CARGO OU ESPECIALIDADE
        </h2>

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end text-xs">
          <div className="sm:col-span-1">
            <label className="block font-bold text-[var(--color-text)] mb-1.5">
              NOME DO CARGO <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: House Cleaner, Helper, Barbeiro Senior"
              required
              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-medium focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block font-bold text-[var(--color-text)] mb-1.5">DESCRIÇÃO (OPCIONAL)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Responsável por limpeza pesada e higienização"
              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-3 font-medium focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 bg-[#635bff] hover:bg-[#544dc9] text-white font-semibold text-xs rounded-[var(--radius-control)] shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{isPending ? "SALVANDO..." : "+ CARGO"}</span>
          </button>
        </form>
      </div>

      {/* LISTA DE CARGOS CADASTRADOS */}
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <h2 className="text-base font-semibold text-[var(--color-text-heading)]">Cargos & Especialidades Cadastrados</h2>
          <span className="text-xs text-[var(--color-text-muted)] font-medium">Total: {rolesList.length}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {rolesList.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">{r.name}</h3>
                  {r.isPreset && (
                    <span className="text-[var(--text-2xs)] font-semibold uppercase bg-[var(--color-primary-light)] text-[var(--color-primary)] px-2 py-0.5 rounded-full">
                      Preset
                    </span>
                  )}
                </div>
                {r.description && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{r.description}</p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDelete(r.id, r.name)}
                  className="px-3 py-1.5 bg-[var(--color-danger-light)] hover:bg-[var(--color-danger-light)] text-[var(--color-danger)] font-bold text-[var(--text-2xs)] rounded-[var(--radius-control)] transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span>EXCLUIR</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
