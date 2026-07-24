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
    <div className="p-8 w-full max-w-7xl text-left space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">
          <Award className="w-6 h-6 text-indigo-600 inline-block mr-2" />
          Programa de Fidelidade & Pontos
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Recompense clientes recorrentes gerando acúmulo de pontos a cada atendimento concluído.
        </p>
      </div>

      {/* Configuração de Regras */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">Regras de Acúmulo e Resgate</h2>
            <p className="text-xs text-stone-500">Configure o valor dos pontos concedidos por atendimento.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
            />
            <span className="text-xs font-bold text-stone-800">Programa Ativo</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Pontos por 1,00 {initialProgram.currency} gasto
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={pointsPerCurrency}
              onChange={(e) => setPointsPerCurrency(parseFloat(e.target.value) || 1)}
              disabled={!isEnabled}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
            />
            <p className="text-[11px] text-stone-400 mt-1">Ex: R$ 100 pago = {100 * pointsPerCurrency} pontos</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Pontos para Resgate (Meta)
            </label>
            <input
              type="number"
              min="1"
              value={rewardThreshold}
              onChange={(e) => setRewardThreshold(parseInt(e.target.value, 10) || 100)}
              disabled={!isEnabled}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
            />
            <p className="text-[11px] text-stone-400 mt-1">Pontos necessários para o voucher</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Desconto do Voucher ({initialProgram.currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="1"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 20)}
              disabled={!isEnabled}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
            />
            <p className="text-[11px] text-stone-400 mt-1">Desconto aplicado ao atingir a meta</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Salvar Configurações de Fidelidade"}
          </button>
        </div>
      </div>

      {/* Ranking de Clientes */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-4 shadow-sm">
        <h2 className="text-base font-bold text-stone-900">🏆 Extrato de Pontuação de Clientes</h2>
        
        {customers.length === 0 ? (
          <p className="text-xs text-stone-400 py-6 text-center">
            Nenhum ponto acumulado ainda. Os pontos serão creditados automaticamente na conclusão dos atendimentos.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {customers.map((c, i) => (
              <div key={i} className="py-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-800">{c.customerEmail}</span>
                <span className="font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  ⭐ {c.points} pontos
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
