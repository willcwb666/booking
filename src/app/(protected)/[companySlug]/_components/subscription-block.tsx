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
    <div className="min-h-screen bg-[var(--color-bg-subtle)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[var(--radius-card)] bg-[var(--color-danger-light)] text-[var(--color-danger)] mb-4 text-2xl" aria-hidden="true">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-heading)]">Assinatura vencida</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-xl mx-auto">
            O acesso de <span className="font-semibold">{companyName}</span> está suspenso porque a
            assinatura {overdueSince ? `venceu em ${overdueSince}` : "está vencida"} e o período de
            tolerância terminou. Escolha um plano e regularize para retomar o acesso — seus dados
            continuam salvos.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={interval === "month" ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={interval === "year" ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
          >
            Anual
          </button>
        </div>

        {error && (
          <p role="alert" className="alert alert-danger mb-4">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const price = interval === "year" ? plan.priceYearly / 12 : plan.priceMonthly;
            return (
              <div key={plan.id} className="card card-body flex flex-col">
                <p className="text-sm font-bold text-[var(--color-text-heading)]">{plan.displayName}</p>
                <p className="text-xs text-[var(--color-text-muted)] mb-3 min-h-[2rem]">{plan.description}</p>
                <p className="text-2xl font-bold text-[var(--color-text-heading)]">
                  {money(price)}
                  <span className="text-sm font-normal text-[var(--color-text-subtle)]"> /mês</span>
                </p>
                {interval === "year" && (
                  <p className="text-xs text-[var(--color-success)] mt-1">cobrado anualmente</p>
                )}
                <button
                  type="button"
                  onClick={() => subscribe(plan.id)}
                  disabled={pendingId !== null}
                  className="btn btn-primary w-full mt-4"
                >
                  {pendingId === plan.id ? "Redirecionando…" : "Assinar"}
                </button>
              </div>
            );
          })}
          {plans.length === 0 && (
            <p className="col-span-full text-center text-sm text-[var(--color-text-muted)] py-8 card">
              Nenhum plano disponível no momento. Contate o suporte.
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-[var(--color-text-subtle)]">
          <a href="/selecionar-empresa" className="hover:text-[var(--color-text-muted)]">Trocar de empresa</a>
          <span aria-hidden="true">·</span>
          <form action={logoutAction}>
            <button type="submit" className="hover:text-[var(--color-text-muted)]">Sair da conta</button>
          </form>
        </div>
      </div>
    </div>
  );
}
