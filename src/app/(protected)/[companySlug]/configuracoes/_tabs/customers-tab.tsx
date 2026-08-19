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
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 space-y-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
          <span className="p-2.5 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary)]">
            <Users className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-heading)]">
              Política de Clientes & Tolerância de Faltas (No-Show)
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
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
            className={`p-4 rounded-[var(--radius-card)] border-2 text-left transition-all cursor-pointer ${
              isDefault
                ? "border-[var(--color-success-border)] bg-[var(--color-success-light)] shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-border-strong)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-heading)] flex items-center gap-1.5">
                ⚡ Tolerância Padrão (2 Faltas)
              </span>
              <span className="px-2 py-0.5 bg-[var(--color-success)] text-white rounded-full text-[var(--text-2xs)] font-semibold uppercase">
                Recomendada
              </span>
            </div>
            <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)] font-medium mt-1.5 leading-relaxed">
              Permite até 2 faltas não justificadas por cliente antes de bloquear agendamentos gratuitos e exigir sinal Pix/Cartão.
            </p>
          </button>

          <div
            className={`p-4 rounded-[var(--radius-card)] border-2 text-left transition-all ${
              !isDefault
                ? "border-[var(--color-navy)] bg-[var(--color-bg-subtle)] shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-bg)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-heading)] flex items-center gap-1.5">
                🛠️ Tolerância Personalizada
              </span>
              <span className="px-2 py-0.5 bg-[var(--color-bg-muted)] text-[var(--color-text)] rounded-full text-[var(--text-2xs)] font-bold uppercase">
                Customizável
              </span>
            </div>
            <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)] font-medium mt-1.5 leading-relaxed">
              Defina um limite de faltas mais rígido (1 falta) ou mais flexível (3+ faltas) nos campos abaixo.
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--color-text)]">
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
                className="w-32 px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-sm font-semibold text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
              />
              <span className="text-xs text-[var(--color-text-muted)] font-medium">faltas sem aviso acumuladas</span>
            </div>
            <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)] leading-relaxed pt-1">
              Quando um cliente ultrapassar este número de faltas não justificadas, o sistema acionará automaticamente a regra de proteção.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-[var(--color-warning-light)] p-4 rounded-[var(--radius-card)] border border-[var(--color-warning-border)] space-y-2">
              <div className="flex items-center gap-2 text-[var(--color-warning)] font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                <span>Alerta no Painel Interno (Atendente)</span>
              </div>
              <p className="text-xs text-[var(--color-warning)] leading-relaxed">
                Ao selecionar o cliente em um novo agendamento, o sistema exibirá um aviso vermelho em destaque:
                <strong className="block mt-1 font-bold text-[var(--color-warning)]">
                  "⚠️ Atenção: Cliente com {maxAllowedNoShows} faltas sem aviso acumuladas."
                </strong>
              </p>
            </div>

            <div className="bg-[var(--color-primary-light)] p-4 rounded-[var(--radius-card)] border border-[var(--color-primary)] space-y-2">
              <div className="flex items-center gap-2 text-[var(--color-text-heading)] font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
                <span>Proteção no Agendamento Público Online</span>
              </div>
              <p className="text-xs text-[var(--color-primary)] leading-relaxed">
                Quando o cliente tentar agendar sozinho pelo portal público, o agendamento gratuito será bloqueado e o sistema
                <strong className="block mt-1 font-bold text-[var(--color-text-heading)]">
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
