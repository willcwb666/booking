"use client";

import React from "react";
import { Users, AlertTriangle, ShieldCheck, Info } from "@/components/ui/icons";

type Props = {
  maxAllowedNoShows: number;
  onChangeMaxAllowedNoShows: (val: number) => void;
  canEdit: boolean;
};

export function CustomersTab({
  maxAllowedNoShows,
  onChangeMaxAllowedNoShows,
  canEdit,
}: Props) {
  const isDefault = maxAllowedNoShows === 2;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Users className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Política de Clientes & Tolerância de Faltas (No-Show)
            </h2>
            <p className="text-xs text-slate-500">
              Configure o limite de faltas sem aviso prévio permitidas por cliente e as ações automáticas de proteção.
            </p>
          </div>
        </div>

        {/* ── Seletor de Modo Padrão vs Personalizado ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onChangeMaxAllowedNoShows(2)}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
              isDefault
                ? "border-emerald-600 bg-emerald-50/60 shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                ⚡ Tolerância Padrão (2 Faltas)
              </span>
              <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase">
                Recomendada
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-1.5 leading-relaxed">
              Permite até 2 faltas não justificadas por cliente antes de bloquear agendamentos gratuitos e exigir sinal Pix/Cartão.
            </p>
          </button>

          <div
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              !isDefault
                ? "border-slate-900 bg-slate-50 shadow-xs"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                🛠️ Tolerância Personalizada
              </span>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[9px] font-bold uppercase">
                Customizável
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium mt-1.5 leading-relaxed">
              Defina um limite de faltas mais rígido (1 falta) ou mais flexível (3+ faltas) nos campos abaixo.
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Limite de Faltas Sem Aviso Permitidas (No-Shows Max)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={10}
                value={maxAllowedNoShows}
                onChange={(e) => onChangeMaxAllowedNoShows(Number(e.target.value) || 1)}
                disabled={!canEdit}
                className="w-32 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <span className="text-xs text-slate-500 font-medium">faltas sem aviso acumuladas</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
              Quando um cliente ultrapassar este número de faltas não justificadas, o sistema acionará automaticamente a regra de proteção.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Alerta no Painel Interno (Atendente)</span>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed">
                Ao selecionar o cliente em um novo agendamento, o sistema exibirá um aviso vermelho em destaque:
                <strong className="block mt-1 font-bold text-amber-950">
                  "⚠️ Atenção: Cliente com {maxAllowedNoShows} faltas sem aviso acumuladas."
                </strong>
              </p>
            </div>

            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200/80 space-y-2">
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Proteção no Agendamento Público Online</span>
              </div>
              <p className="text-xs text-indigo-800/90 leading-relaxed">
                Quando o cliente tentar agendar sozinho pelo portal público, o agendamento gratuito será bloqueado e o sistema
                <strong className="block mt-1 font-bold text-indigo-950">
                  exigirá pagamento/sinal prévio obrigatório
                </strong> para confirmar a reserva.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
