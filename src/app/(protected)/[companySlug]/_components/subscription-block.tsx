"use client";

import { useState, useTransition } from "react";
import { createPlanCheckoutAction } from "@/server/actions/subscription";
import { logoutAction } from "@/server/actions/auth";

type PlanOption = {
  id: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
};

export function SubscriptionBlock({
  companySlug,
  companyName,
  overdueSince,
  currency,
  locale,
  plans,
}: {
  companySlug: string;
  companyName: string;
  overdueSince: string | null;
  currency: string;
  locale: string;
  plans: PlanOption[];
}) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const money = (v: number) =>
    new Intl.NumberFormat(locale || "pt-BR", {
      style: "currency",
      currency: (currency || "BRL").toUpperCase(),
      maximumFractionDigits: v % 1 === 0 ? 0 : 2,
    }).format(v);

  function subscribe(planId: string) {
    setError(null);
    setPendingId(planId);
    startTransition(async () => {
      const result = await createPlanCheckoutAction(companySlug, planId, interval);
      if (result.success) {
        window.location.href = result.url;
      } else {
        setError(result.error);
        setPendingId(null);
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 text-red-600 mb-4 text-2xl" aria-hidden="true">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Assinatura vencida</h1>
          <p className="text-sm text-gray-600 mt-2 max-w-xl mx-auto">
            O acesso de <span className="font-semibold">{companyName}</span> está suspenso porque a
            assinatura {overdueSince ? `venceu em ${overdueSince}` : "está vencida"} e o período de
            tolerância terminou. Escolha um plano e regularize para retomar o acesso — seus dados
            continuam salvos.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              interval === "month" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              interval === "year" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Anual
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-center">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const price = interval === "year" ? plan.priceYearly / 12 : plan.priceMonthly;
            return (
              <div key={plan.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
                <p className="text-sm font-bold text-gray-900">{plan.displayName}</p>
                <p className="text-xs text-gray-500 mb-3 min-h-[2rem]">{plan.description}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {money(price)}
                  <span className="text-sm font-normal text-gray-400"> /mês</span>
                </p>
                {interval === "year" && (
                  <p className="text-xs text-emerald-600 mt-1">cobrado anualmente</p>
                )}
                <button
                  type="button"
                  onClick={() => subscribe(plan.id)}
                  disabled={pendingId !== null}
                  className="mt-4 px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {pendingId === plan.id ? "Redirecionando…" : "Assinar"}
                </button>
              </div>
            );
          })}
          {plans.length === 0 && (
            <p className="col-span-full text-center text-sm text-gray-500 py-8 bg-white rounded-2xl border border-gray-200">
              Nenhum plano disponível no momento. Contate o suporte.
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-gray-400">
          <a href="/selecionar-empresa" className="hover:text-gray-600">Trocar de empresa</a>
          <span aria-hidden="true">·</span>
          <form action={logoutAction}>
            <button type="submit" className="hover:text-gray-600">Sair da conta</button>
          </form>
        </div>
      </div>
    </div>
  );
}
