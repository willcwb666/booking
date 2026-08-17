"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createFullServiceAction, updateFullServiceAction } from "@/server/actions/services";
import { toast } from "@/lib/toast-service";
import { Scissors, CheckCircle2, ArrowLeft, Clock } from "@/components/ui/icons";
import { ServiceIconPicker } from "@/components/ui/service-icon-picker";

type ServiceInitialData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  estimatedMinutes: number;
  category: "DEFAULT" | "EXTRA";
  icon?: string | null;
  isActive: boolean;
};

type Props = {
  companySlug: string;
  initialData?: ServiceInitialData | null;
};

export function ServiceFormClient({ companySlug, initialData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditing = Boolean(initialData?.id);
  const [category, setCategory] = useState<"DEFAULT" | "EXTRA">(initialData?.category || "DEFAULT");
  const [selectedIcon, setSelectedIcon] = useState<string>(initialData?.icon || (category === "EXTRA" ? "sparkles" : "scissors"));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("companySlug", companySlug);
    fd.set("category", category);
    fd.set("icon", selectedIcon);

    if (isEditing && initialData) {
      fd.set("id", initialData.id);
    }

    startTransition(async () => {
      const res = isEditing
        ? await updateFullServiceAction(fd)
        : await createFullServiceAction(fd);

      if (res.success) {
        toast.success(
          isEditing ? "ATUALIZADO!" : "CADASTRADO!",
          isEditing ? "Serviço atualizado com sucesso." : "Serviço adicionado ao catálogo com sucesso."
        );
        router.push(`/${companySlug}/servicos`);
        router.refresh();
      } else {
        const errorMsg = res.errors?.["_"]?.[0] || res.errors?.name?.[0] || "Preencha todos os campos obrigatórios.";
        toast.error("Atenção", errorMsg);
      }
    });
  }

  return (
    <div className="w-full max-w-4xl px-6 sm:px-10 py-8 text-left space-y-8 pb-32">
      {/* Header com botão Voltar */}
      <div>
        <Link
          href={`/${companySlug}/servicos`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-2 uppercase"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>VOLTAR PARA SERVIÇOS</span>
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {isEditing ? `EDITAR SERVIÇO: ${initialData?.name?.toUpperCase()}` : "NOVO CADASTRO DE SERVIÇO"}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Informe os dados básicos do serviço, escolha um ícone do catálogo, valor de tabela e tempo estimado de execução.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">DADOS DO SERVIÇO</h2>
              <p className="text-xs text-slate-500 font-medium">Informações exibidas no seu catálogo de agendamentos.</p>
            </div>
          </div>

          <div className="space-y-5 text-xs">
            {/* TIPO DE SERVIÇO: PADRÃO VS EXTRA */}
            {!isEditing && (
              <div>
                <label className="block font-bold text-slate-700 mb-2">MODALIDADE DO SERVIÇO</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCategory("DEFAULT");
                      setSelectedIcon("scissors");
                    }}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      category === "DEFAULT"
                        ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs font-extrabold"
                        : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>SERVIÇO PADRÃO</span>
                      {category === "DEFAULT" && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 block mt-1">
                      Serviço principal do catálogo oferecido aos clientes.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCategory("EXTRA");
                      setSelectedIcon("sparkles");
                    }}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                      category === "EXTRA"
                        ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs font-extrabold"
                        : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>SERVIÇO EXTRA / ADICIONAL</span>
                      {category === "EXTRA" && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 block mt-1">
                      Adicional opcional (ex: lavagem especial, produto extra).
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                NOME DO SERVIÇO <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                defaultValue={initialData?.name || ""}
                placeholder="Ex: Corte de Cabelo Masculino, Limpeza de Pele"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* SELETOR VISUAL DE ÍCONES (SEM UPLOAD) */}
            <ServiceIconPicker
              selectedIcon={selectedIcon}
              onSelectIcon={(iconName) => setSelectedIcon(iconName)}
            />

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">DESCRIÇÃO DO SERVIÇO</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={initialData?.description || ""}
                placeholder="Descreva detalhes do atendimento, produtos inclusos ou recomendações..."
                className="w-full border border-slate-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  VALOR (R$) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    required
                    defaultValue={initialData?.price ?? ""}
                    placeholder="50,00"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-extrabold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  TEMPO DE EXECUÇÃO (MINUTOS) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="number"
                    step="1"
                    min="5"
                    name="estimatedMinutes"
                    required
                    defaultValue={initialData?.estimatedMinutes ?? 30}
                    placeholder="30"
                    className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-extrabold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA DE AÇÃO UPPERCASE */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={`/${companySlug}/servicos`}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all uppercase"
          >
            CANCELAR
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-8 py-3 bg-[#635bff] hover:bg-[#544dc9] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2 uppercase"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isPending ? "SALVANDO..." : isEditing ? "SALVAR ALTERAÇÕES" : "CONCLUIR CADASTRO"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
