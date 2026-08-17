"use client";

import React from "react";
import { DollarSign, CheckCircle2, Users, FileText } from "@/components/ui/icons";

export default function SplitComissoesPage() {
  return (
    <div className="w-full max-w-7xl px-6 sm:px-10 py-8 text-left space-y-8">
      <div>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
          <DollarSign className="w-4 h-4" />
          <span>Módulo Extra Ativo</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
          Split Automático de Comissões
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Divisão instantânea de comissões por atendimento e repasse automático para cada profissional.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400">Total a Repassar (Mês)</span>
          <p className="text-2xl font-black text-slate-900">R$ 0,00</p>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Split Calculado
          </span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400">Profissionais com Split</span>
          <p className="text-2xl font-black text-indigo-600">0 Profissionais</p>
          <span className="text-[11px] font-medium text-slate-500">Configurado no cadastro</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-400">Status do Split</span>
          <p className="text-2xl font-black text-emerald-600">Módulo Ativo 🚀</p>
          <span className="text-[11px] font-medium text-slate-500">Liberado pelo Super Admin</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center text-slate-500 space-y-3">
        <DollarSign className="w-12 h-12 text-indigo-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Gestão de Split de Comissões Habilitada</h3>
        <p className="text-xs max-w-lg mx-auto text-slate-600">
          As regras de divisão de valores por atendimento são aplicadas automaticamente em cada fechamento de comanda e agendamento.
        </p>
      </div>
    </div>
  );
}
