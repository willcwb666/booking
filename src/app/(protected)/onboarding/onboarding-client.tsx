"use client";

import { useActionState, useState, useTransition } from "react";
import { createCompanyAction } from "@/server/actions/company";
import { BUSINESS_TYPES, generateSlug } from "@/schemas/company.schema";

type PlanFeature = {
  featureKey: string;
  featureLabel: string;
  enabled: boolean;
  limitValue: number | null;
};

type Plan = {
  id: string;
  tier: string;
  displayName: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeature[];
};

type Props = { plans: Plan[]; userName: string };

const STEPS = ["Tipo de Negócio", "Plano", "Detalhes"] as const;

export function OnboardingClient({ plans, userName }: Props) {
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState("");
  const [planId, setPlanId] = useState("");
  const [name, setName] = useState("");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const [state, formAction] = useActionState(createCompanyAction, null);
  const [pending, startTransition] = useTransition();

  const slugPreview = generateSlug(name);

  function next() { setStep((s) => Math.min(s + 1, 2)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  const canNext =
    (step === 0 && businessType !== "") ||
    (step === 1 && planId !== "");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-sm text-gray-500 mb-1">Bem-vindo, {userName}</p>
        <h1 className="text-2xl font-bold text-gray-900">Configure sua empresa</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < step
                  ? "bg-gray-900 text-white"
                  : i === step
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === step ? "text-gray-900 font-medium" : "text-gray-400"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl">
        {/* Step 0 — Business Type */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Qual é o tipo do seu negócio?</h2>
            <p className="text-sm text-gray-500 mb-6">Selecione a categoria que melhor descreve seus serviços.</p>
            <div className="grid grid-cols-3 gap-3">
              {BUSINESS_TYPES.map((bt) => (
                <button
                  key={bt.value}
                  type="button"
                  onClick={() => setBusinessType(bt.value)}
                  className={`rounded-xl border-2 p-4 text-sm font-medium text-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    businessType === bt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  {bt.label}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!canNext}
                onClick={next}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Plan */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Escolha seu plano</h2>
            <p className="text-sm text-gray-500 mb-4">Você pode mudar de plano a qualquer momento.</p>

            {/* Billing toggle */}
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors ${billing === "monthly" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBilling("yearly")}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors ${billing === "yearly" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}
              >
                Anual <span className="text-green-500 font-medium">-17%</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const price = billing === "monthly" ? plan.priceMonthly : plan.priceYearly / 12;
                const isSelected = planId === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanId(plan.id)}
                    className={`rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isSelected
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className={`font-semibold mb-0.5 ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                      {plan.displayName}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">{plan.description}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      R$ {price.toFixed(2).replace(".", ",")}
                      <span className="text-sm font-normal text-gray-500">/mês</span>
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f.featureKey} className={`flex items-start gap-2 text-xs ${f.enabled ? "text-gray-700" : "text-gray-400 line-through"}`}>
                          <span className="mt-px">{f.enabled ? "✓" : "✗"}</span>
                          {f.featureLabel}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between">
              <button type="button" onClick={back} className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Voltar
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={next}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Company Details */}
        {step === 2 && (
          <form
            action={(fd) => startTransition(() => formAction(fd))}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
          >
            <input type="hidden" name="businessType" value={businessType} />
            <input type="hidden" name="planId" value={planId} />

            <h2 className="text-lg font-semibold text-gray-900 mb-1">Dados da empresa</h2>
            <p className="text-sm text-gray-500 mb-6">Essas informações ficam visíveis para os seus clientes.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da empresa <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Clean Home SP"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {name && (
                  <p className="mt-1 text-xs text-gray-400">
                    Endereço: <span className="font-mono text-gray-600">/{slugPreview}</span>
                  </p>
                )}
                {state?.success === false && "name" in (state.errors as object) && (
                  <p className="mt-1 text-xs text-red-500">{(state.errors as Record<string, string[]>).name?.[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input
                  name="address"
                  placeholder="Rua, número, cidade"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {state?.success === false && "_" in (state.errors as object) && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {(state.errors as Record<string, string[]>)._?.[0]}
              </p>
            )}

            <div className="mt-6 flex justify-between">
              <button type="button" onClick={back} className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Voltar
              </button>
              <button
                type="submit"
                disabled={pending || !name}
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
              >
                {pending ? "Criando..." : "Criar empresa"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
