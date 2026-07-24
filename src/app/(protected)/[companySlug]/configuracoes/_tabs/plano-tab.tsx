"use client";

import React, { useState, useTransition } from "react";
import { formatMoney } from "@/lib/format";
import { createPlanCheckoutAction, createBillingPortalAction } from "@/server/actions/subscription";
import { toast } from "@/lib/toast-service";

type BillingPlan = {
  id: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  billable: boolean;
};

type Props = {
  companySlug: string;
  billing: {
    isOwner: boolean;
    currency: string;
    currentPlanId: string;
    subscriptionStatus: string | null;
    subscriptionInterval: string | null;
    subscriptionPeriodEnd: string | null;
    hasCustomer: boolean;
    plans: BillingPlan[];
  };
};

export function PlanoTab({ companySlug, billing }: Props) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">(
    billing.subscriptionInterval === "year" ? "yearly" : "monthly"
  );
  const [isPending, startTransition] = useTransition();

  function handleSelectPlan(planId: string) {
    const interval = cycle === "yearly" ? "year" : "month";
    startTransition(async () => {
      const res = await createPlanCheckoutAction(companySlug, planId, interval);
      if (res.success) {
        window.location.href = res.url;
      } else {
        toast.error("Erro", res.error || "Falha ao iniciar pagamento do plano.");
      }
    });
  }

  function handleOpenPortal() {
    startTransition(async () => {
      const res = await createBillingPortalAction(companySlug);
      if (res.success) {
        window.location.href = res.url;
      } else {
        toast.error("Erro", res.error || "Falha ao abrir portal de faturamento.");
      }
    });
  }

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Plano de Assinatura da Empresa</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Alterne entre planos ou gerencie os dados de pagamento e faturamento no Stripe.
            </p>
          </div>

          {billing.hasCustomer && (
            <button
              type="button"
              onClick={handleOpenPortal}
              disabled={isPending}
              className="px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              Gerenciar Faturamento ➔
            </button>
          )}
        </div>

        {/* Toggle de Ciclo: Mensal vs Anual */}
        <div className="flex items-center justify-center gap-3 py-2 bg-stone-50 rounded-2xl border border-stone-200 w-fit mx-auto px-4">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              cycle === "monthly" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
            }`}
          >
            Cobrança Mensal
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              cycle === "yearly" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
            }`}
          >
            <span>Cobrança Anual</span>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
              Desconto
            </span>
          </button>
        </div>

        {/* Lista de Planos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {billing.plans.map((p) => {
            const isCurrentPlan =
              p.id === billing.currentPlanId &&
              (billing.subscriptionInterval
                ? (cycle === "yearly" && billing.subscriptionInterval === "year") ||
                  (cycle === "monthly" && billing.subscriptionInterval === "month")
                : true);

            const price = cycle === "yearly" ? p.priceYearly : p.priceMonthly;

            return (
              <div
                key={p.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                  isCurrentPlan
                    ? "border-amber-500 bg-amber-50/30 ring-2 ring-amber-400/40"
                    : "border-stone-200 bg-white"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-stone-900 text-sm">{p.displayName}</h3>
                    {isCurrentPlan && (
                      <span className="px-2 py-0.5 bg-amber-500 text-white font-black text-[10px] rounded-full uppercase">
                        Plano Atual
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 min-h-[36px]">{p.description}</p>
                  <div className="pt-2">
                    <span className="text-xl font-extrabold text-stone-900">
                      {formatMoney(price, billing.currency)}
                    </span>
                    <span className="text-[11px] text-stone-400">/{cycle === "yearly" ? "ano" : "mês"}</span>
                  </div>
                </div>

                {billing.isOwner && (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(p.id)}
                    disabled={isCurrentPlan || isPending}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed ${
                      isCurrentPlan
                        ? "bg-stone-100 text-stone-400 border border-stone-200"
                        : "bg-amber-500 hover:bg-amber-600 text-white"
                    }`}
                  >
                    {isCurrentPlan ? "Plano Ativo" : "Selecionar Plano"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
