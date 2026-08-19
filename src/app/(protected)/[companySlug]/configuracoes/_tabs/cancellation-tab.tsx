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
  const isDefaultPolicy =
    formState.minCancellationNoticeHours === 24 &&
    formState.cancellationFee === 0 &&
    formState.lateToleranceMinutes === 15;

  function handleSetDefault() {
    onChange("minCancellationNoticeHours", 24);
    onChange("cancellationFee", 0);
    onChange("lateToleranceMinutes", 15);
  }

  return (
    <div className="space-y-6 text-left">
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-[var(--color-text-heading)]">Política de Cancelamentos & Tolerância</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Defina o tempo mínimo para cancelamento sem penalidades e a tolerância de atraso dos atendimentos.
          </p>
        </div>

        {/* ── Seletor de Modo Padrão vs Personalizado ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
          <button
            type="button"
            disabled={!canEdit}
            onClick={handleSetDefault}
            className={`p-4 rounded-[var(--radius-card)] border-2 text-left transition-all cursor-pointer ${
              isDefaultPolicy
                ? "border-[var(--color-success-border)] bg-[var(--color-success-light)] shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-strong)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-heading)] flex items-center gap-1.5">
                ⚡ Política Padrão do Mercado
              </span>
              <span className="px-2 py-0.5 bg-[var(--color-success)] text-white rounded-full text-[var(--text-2xs)] font-semibold uppercase">
                Recomendada
              </span>
            </div>
            <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)] font-medium mt-1.5 leading-relaxed">
              24h de antecedência mínima, sem taxa punitiva e 15 minutos de tolerância de atraso. O padrão de ouro aceito pela maioria dos clientes.
            </p>
          </button>

          <div
            className={`p-4 rounded-[var(--radius-card)] border-2 text-left transition-all ${
              !isDefaultPolicy
                ? "border-[var(--color-navy)] bg-[var(--color-bg-subtle)] shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-bg)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-heading)] flex items-center gap-1.5">
                🛠️ Política Personalizada
              </span>
              <span className="px-2 py-0.5 bg-[var(--color-bg-muted)] text-[var(--color-text)] rounded-full text-[var(--text-2xs)] font-bold uppercase">
                Customizável
              </span>
            </div>
            <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)] font-medium mt-1.5 leading-relaxed">
              Ajuste manualmente os prazos, multas e minutos nos campos abaixo para atender às exigências específicas do seu negócio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-[var(--color-border)] pt-5">
          {/* Tempo mínimo antecedente */}
          <div>
            <label htmlFor="minCancellationNoticeHours" className="block text-xs font-bold text-[var(--color-text-heading)] mb-1">
              Antecedência mínima
            </label>
            <select
              id="minCancellationNoticeHours"
              value={formState.minCancellationNoticeHours}
              onChange={(e) => onChange("minCancellationNoticeHours", parseInt(e.target.value, 10))}
              disabled={!canEdit}
              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] disabled:bg-[var(--color-bg-subtle)]"
            >
              <option value={12}>12 horas antes</option>
              <option value={24}>24 horas antes (Padrão)</option>
              <option value={36}>36 horas antes</option>
              <option value={48}>48 horas antes</option>
              <option value={72}>72 horas antes</option>
            </select>
            <p className="mt-1 text-[var(--text-2xs)] text-[var(--color-text-subtle)]">
              Prazo mínimo antes do horário marcado.
            </p>
          </div>

          {/* Taxa de cancelamento tardio */}
          <div>
            <label htmlFor="cancellationFee" className="block text-xs font-bold text-[var(--color-text-heading)] mb-1">
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
              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-[var(--color-bg-subtle)]"
            />
            <p className="mt-1 text-[var(--text-2xs)] text-[var(--color-text-subtle)]">
              Valor automático cobrado fora do prazo.
            </p>
          </div>

          {/* Tolerância de Atraso */}
          <div>
            <label htmlFor="lateToleranceMinutes" className="block text-xs font-bold text-[var(--color-text-heading)] mb-1">
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
              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-[var(--color-bg-subtle)]"
            />
            <p className="mt-1 text-[var(--text-2xs)] text-[var(--color-text-subtle)]">
              Minutos tolerados antes do No-Show.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
