"use client";

import React, { useState, useTransition } from "react";
import { updateCompanyLoyaltyProgramAction } from "@/server/actions/loyalty";
import { toast } from "@/lib/toast-service";
import { Award } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  initialProgram: {
    isEnabled: boolean;
    pointsPerCurrency: number;
    rewardThreshold: number;
    discountAmount: number;
    currency: string;
  };
  customers: Array<{ customerEmail: string; points: number }>;
};

export function LoyaltyClient({ companySlug, initialProgram, customers }: Props) {
  const [isEnabled, setIsEnabled] = useState(initialProgram.isEnabled);
  const [pointsPerCurrency, setPointsPerCurrency] = useState(initialProgram.pointsPerCurrency);
  const [rewardThreshold, setRewardThreshold] = useState(initialProgram.rewardThreshold);
  const [discountAmount, setDiscountAmount] = useState(initialProgram.discountAmount);

  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await updateCompanyLoyaltyProgramAction(companySlug, {
        isEnabled,
        pointsPerCurrency,
        rewardThreshold,
        discountAmount,
      });

      if (res.success) {
        toast.success("Salvo!", res.message || "Programa de fidelidade atualizado.");
      } else {
        toast.error("Erro", res.error || "Falha ao salvar programa de fidelidade.");
      }
    });
  }

  return (
    <div className="page-container">
     <div className="page-content space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-heading)] tracking-tight">
          <Award className="w-6 h-6 text-[var(--color-primary)] inline-block mr-2" />
          Programa de Fidelidade & Pontos
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Recompense clientes recorrentes gerando acúmulo de pontos a cada atendimento concluído.
        </p>
      </div>

      {/* Configuração de Regras */}
      <div className="card p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-heading)]">Regras de Acúmulo e Resgate</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Configure o valor dos pontos concedidos por atendimento.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-5 h-5 rounded text-[var(--color-warning)] focus:ring-[var(--color-primary)] border-[var(--color-border-strong)]"
            />
            <span className="text-xs font-bold text-[var(--color-text-heading)]">Programa Ativo</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="input-label">
              Pontos por 1,00 {initialProgram.currency} gasto
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={pointsPerCurrency}
              onChange={(e) => setPointsPerCurrency(parseFloat(e.target.value) || 1)}
              disabled={!isEnabled}
              className="input"
            />
            <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1">Ex: R$ 100 pago = {100 * pointsPerCurrency} pontos</p>
          </div>

          <div>
            <label className="input-label">
              Pontos para Resgate (Meta)
            </label>
            <input
              type="number"
              min="1"
              value={rewardThreshold}
              onChange={(e) => setRewardThreshold(parseInt(e.target.value, 10) || 100)}
              disabled={!isEnabled}
              className="input"
            />
            <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1">Pontos necessários para o voucher</p>
          </div>

          <div>
            <label className="input-label">
              Desconto do Voucher ({initialProgram.currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 20)}
              disabled={!isEnabled}
              className="input"
            />
            <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1">Desconto aplicado ao atingir a meta</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn btn-primary"
          >
            {isPending ? "Salvando..." : "Salvar Configurações de Fidelidade"}
          </button>
        </div>
      </div>

      {/* Ranking de Clientes */}
      <div className="card p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-[var(--color-text-heading)]">🏆 Extrato de Pontuação de Clientes</h2>
        
        {customers.length === 0 ? (
          <p className="text-xs text-[var(--color-text-subtle)] py-6 text-center">
            Nenhum ponto acumulado ainda. Os pontos serão creditados automaticamente na conclusão dos atendimentos.
          </p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {customers.map((c, i) => (
              <div key={i} className="py-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-text-heading)]">{c.customerEmail}</span>
                <span className="font-semibold text-[var(--color-warning)] bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] px-3 py-1 rounded-full">
                  ⭐ {c.points} pontos
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
     </div>
    </div>
  );
}
