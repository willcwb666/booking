"use client";

import React from "react";

type Props = {
  canEdit: boolean;
  currency: string;
  formState: {
    minCancellationNoticeHours: number;
    cancellationFee: number;
    lateToleranceMinutes: number;
  };
  onChange: (field: string, value: number) => void;
};

export function CancellationTab({ canEdit, currency, formState, onChange }: Props) {
  return (
    <div className="space-y-6 text-left">
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-stone-900">Política de Cancelamentos & Tolerância</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Defina o tempo mínimo para cancelamento sem penalidades e a tolerância de atraso dos atendimentos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Tempo mínimo antecedente */}
          <div>
            <label htmlFor="minCancellationNoticeHours" className="block text-xs font-bold text-stone-700 mb-1">
              Antecedência mínima
            </label>
            <select
              id="minCancellationNoticeHours"
              value={formState.minCancellationNoticeHours}
              onChange={(e) => onChange("minCancellationNoticeHours", parseInt(e.target.value, 10))}
              disabled={!canEdit}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-stone-50"
            >
              <option value={12}>12 horas antes</option>
              <option value={24}>24 horas antes</option>
              <option value={36}>36 horas antes</option>
              <option value={48}>48 horas antes</option>
              <option value={72}>72 horas antes</option>
            </select>
            <p className="mt-1 text-[11px] text-stone-400">
              Prazo mínimo antes do horário marcado.
            </p>
          </div>

          {/* Taxa de cancelamento tardio */}
          <div>
            <label htmlFor="cancellationFee" className="block text-xs font-bold text-stone-700 mb-1">
              Taxa cancelamento tardio ({currency})
            </label>
            <input
              id="cancellationFee"
              type="number"
              step="0.01"
              min="0"
              value={formState.cancellationFee}
              onChange={(e) => onChange("cancellationFee", parseFloat(e.target.value) || 0)}
              disabled={!canEdit}
              placeholder="0.00"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
            />
            <p className="mt-1 text-[11px] text-stone-400">
              Valor automático cobrado fora do prazo.
            </p>
          </div>

          {/* Tolerância de Atraso */}
          <div>
            <label htmlFor="lateToleranceMinutes" className="block text-xs font-bold text-stone-700 mb-1">
              Tolerância de atraso (Minutos)
            </label>
            <input
              id="lateToleranceMinutes"
              type="number"
              min="0"
              max="120"
              value={formState.lateToleranceMinutes}
              onChange={(e) => onChange("lateToleranceMinutes", parseInt(e.target.value, 10) || 0)}
              disabled={!canEdit}
              placeholder="15"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
            />
            <p className="mt-1 text-[11px] text-stone-400">
              Minutos tolerados antes do No-Show.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
