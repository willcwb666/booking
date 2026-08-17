"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteProfessionalAction } from "@/server/actions/professionals";
import { toast } from "@/lib/toast-service";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { User, Plus, CheckCircle2, DollarSign, Edit2, Trash2 } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";

function IconPencil() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

type Professional = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  roleTitle?: string | null;
  commissionRate?: number | null;
  commissionPercentage?: number | null;
};

type Props = {
  companySlug: string;
  professionals: Professional[];
  limit: number | null;
};

export function ProfissionaisClient({ companySlug, professionals, limit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const paginatedProfessionals = professionals.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const atLimit = limit !== null && professionals.length >= limit;

  function handleDelete(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja desativar o profissional ${name}?`)) return;
    const fd = new FormData();
    fd.set("companySlug", companySlug);
    fd.set("id", id);

    startTransition(async () => {
      await deleteProfessionalAction(fd);
      toast.success("Desativado", `Profissional ${name} desativado com sucesso.`);
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-7xl px-6 sm:px-10 py-8 text-left space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
            <User className="w-4 h-4" />
            <span>Equipe & Profissionais</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Profissionais Atendentes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {limit !== null
              ? `${professionals.length} de ${limit} profissionais ativos no plano atual.`
              : `${professionals.length} profissional(is) ativo(s) cadastrado(s).`}
          </p>
        </div>

        <Link
          href={`/${companySlug}/profissionais/novo`}
          className={`px-6 py-3 bg-[#635bff] hover:bg-[#544dc9] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 uppercase ${
            atLimit ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>PROFISSIONAL</span>
        </Link>
      </div>

      {atLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-bold text-amber-900">
          ⚠️ Limite de {limit} profissional(is) atingido no seu plano. Faça upgrade para adicionar mais profissionais.
        </div>
      )}

      {/* Tabela de Profissionais */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-base font-extrabold text-slate-900">Lista de Profissionais Cadastrados</h2>
          <span className="text-xs text-slate-500 font-medium">
            Total: {professionals.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                <th className="px-4 py-3">Profissional / Cargo</th>
                <th className="px-4 py-3">Contato (E-mail / WhatsApp)</th>
                <th className="px-4 py-3 text-center">Comissão</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {professionals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400">
                    Nenhum profissional cadastrado. Clique no botão acima para adicionar!
                  </td>
                </tr>
              ) : (
                paginatedProfessionals.map((pro) => (
                  <tr key={pro.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                          {pro.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={pro.avatarUrl} alt={pro.name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            pro.name[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{pro.name}</p>
                          <span className="text-[11px] font-semibold text-indigo-600 block">
                            {pro.roleTitle || "Profissional Atendente"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 space-y-0.5">
                      <p className="text-slate-700 font-medium">{pro.email || "Sem e-mail"}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{pro.phone || "Sem telefone"}</p>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-black text-[11px] inline-flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        {pro.commissionRate !== undefined ? `${pro.commissionRate}%` : "Padrão"}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right space-x-2">
                      <ActionTooltip label="Editar Profissional">
                        <Link
                          href={`/${companySlug}/profissionais/${pro.id}/editar`}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all inline-flex items-center justify-center shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                      </ActionTooltip>

                      <ActionTooltip label="Remover Profissional">
                        <button
                          type="button"
                          onClick={() => handleDelete(pro.id, pro.name)}
                          disabled={isPending}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition-all inline-flex items-center justify-center cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </ActionTooltip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {professionals.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={professionals.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50, 100]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="profissionais"
          />
        )}
      </div>
    </div>
  );
}
