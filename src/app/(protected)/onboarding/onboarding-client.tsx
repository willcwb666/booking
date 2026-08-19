"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createCompanyAction } from "@/server/actions/company";
import { BUSINESS_TYPES, generateSlug } from "@/schemas/company.schema";
import { MARKETS, getMarket, findMarketByTimezone, detectUserMarket, formatPhoneNumber } from "@/lib/markets";
import { LogoUpload } from "@/components/ui/logo-upload";

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

type Props = {
  plans: Plan[];
  userName: string;
  isAdditionalCompany: boolean;
  multiCompanyEnabled: boolean;
};

const STEPS = ["Tipo de Negócio", "Plano", "Detalhes"] as const;

export function OnboardingClient({ plans, userName, isAdditionalCompany, multiCompanyEnabled }: Props) {
  const [step, setStep] = useState(0);
  const [multiCompany, setMultiCompany] = useState(false);
  const [businessType, setBusinessType] = useState("");
  const [planId, setPlanId] = useState("");
  const [name, setName] = useState("");
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [country, setCountry] = useState("BR");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [phone, setPhone] = useState("");

  // Detecta automaticamente o país, idioma, fuso e DDI do navegador do usuário.
  useEffect(() => {
    const { market: detected, timezoneId } = detectUserMarket();
    if (detected) {
      setCountry(detected.code);
      setTimezone(timezoneId);
    }
  }, []);

  const market = getMarket(country) ?? MARKETS[0];

  function handleCountryChange(code: string) {
    setCountry(code);
    const m = getMarket(code);
    if (m) setTimezone(m.timezones[0].id);
  }

  const [state, formAction] = useActionState(createCompanyAction, null);
  const [pending, startTransition] = useTransition();

  const slugPreview = generateSlug(name);

  function next() { setStep((s) => Math.min(s + 1, 2)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  const canNext =
    (step === 0 && businessType !== "") ||
    (step === 1 && planId !== "");

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-sm text-[var(--color-text-muted)] mb-1">Bem-vindo, {userName}</p>
        <h1 className="text-2xl font-bold text-[var(--color-text-heading)]">
          {isAdditionalCompany ? "Cadastre uma nova empresa" : "Configure sua empresa"}
        </h1>
        {isAdditionalCompany && (
          <p className="mt-2 text-xs text-[var(--color-warning)] bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-[var(--radius-control)] px-3 py-2 inline-block">
            A assinatura do plano desta empresa será cobrada individualmente,
            além das assinaturas das suas outras empresas.
          </p>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < step
                  ? "bg-[var(--color-navy)] text-white"
                  : i === step
                  ? "bg-[var(--color-info)] text-white"
                  : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === step ? "text-[var(--color-text-heading)] font-medium" : "text-[var(--color-text-subtle)]"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-[var(--color-border-strong)] mx-1" />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-2xl">
        {/* Step 0 — Business Type */}
        {step === 0 && (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-card)] shadow-sm border border-[var(--color-border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-heading)] mb-1">Qual é o tipo do seu negócio?</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">Selecione a categoria que melhor descreve seus serviços.</p>
            <div className="grid grid-cols-3 gap-3">
              {BUSINESS_TYPES.map((bt) => (
                <button
                  key={bt.value}
                  type="button"
                  onClick={() => setBusinessType(bt.value)}
                  className={`rounded-[var(--radius-control)] border-2 p-4 text-sm font-medium text-center transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] ${
                    businessType === bt.value
                      ? "border-[var(--color-info-border)] bg-[var(--color-info-light)] text-[var(--color-info)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-text)]"
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
                className="px-5 py-2.5 rounded-[var(--radius-control)] bg-[var(--color-info)] text-white text-sm font-medium disabled:opacity-40 hover:bg-[var(--color-info)] transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 1 — Plan */}
        {step === 1 && (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-card)] shadow-sm border border-[var(--color-border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text-heading)] mb-1">Escolha seu plano</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Você pode mudar de plano a qualquer momento.</p>

            {/* Billing toggle */}
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setBilling("monthly")}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors ${billing === "monthly" ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setBilling("yearly")}
                className={`text-sm px-3 py-1.5 rounded-full transition-colors ${billing === "yearly" ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
              >
                Anual <span className="text-[var(--color-success)] font-medium">-17%</span>
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
                    className={`rounded-[var(--radius-control)] border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] ${
                      isSelected
                        ? "border-[var(--color-info-border)] bg-[var(--color-info-light)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    <p className={`font-semibold mb-0.5 ${isSelected ? "text-[var(--color-info)]" : "text-[var(--color-text-heading)]"}`}>
                      {plan.displayName}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mb-3">{plan.description}</p>
                    <p className="text-2xl font-bold text-[var(--color-text-heading)]">
                      R$ {price.toFixed(2).replace(".", ",")}
                      <span className="text-sm font-normal text-[var(--color-text-muted)]">/mês</span>
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f.featureKey} className={`flex items-start gap-2 text-xs ${f.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-subtle)] line-through"}`}>
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
              <button type="button" onClick={back} className="px-5 py-2.5 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors">
                Voltar
              </button>
              <button
                type="button"
                disabled={!canNext}
                onClick={next}
                className="px-5 py-2.5 rounded-[var(--radius-control)] bg-[var(--color-info)] text-white text-sm font-medium disabled:opacity-40 hover:bg-[var(--color-info)] transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Company Details */}
        {step === 2 && (
          <form
            action={(fd) => {
              // Telefone completo com DDI do país selecionado
              const national = phone.trim();
              fd.set("phone", national ? `${market.dialCode} ${national}` : "");
              startTransition(() => formAction(fd));
            }}
            className="bg-[var(--color-bg)] rounded-[var(--radius-card)] shadow-sm border border-[var(--color-border)] p-6"
          >
            <input type="hidden" name="businessType" value={businessType} />
            <input type="hidden" name="planId" value={planId} />

            <h2 className="text-lg font-semibold text-[var(--color-text-heading)] mb-1">Dados da empresa</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">Essas informações ficam visíveis para os seus clientes.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                  Nome da empresa <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Clean Home SP"
                  required
                  className="w-full px-3 py-2.5 border border-[var(--color-border-strong)] rounded-[var(--radius-control)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                />
                {name && (
                  <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                    Endereço: <span className="font-mono text-[var(--color-text-muted)]">/{slugPreview}</span>
                  </p>
                )}
                {state?.success === false && "name" in (state.errors as object) && (
                  <p className="mt-1 text-xs text-[var(--color-danger)]">{(state.errors as Record<string, string[]>).name?.[0]}</p>
                )}
              </div>

              <LogoUpload label="Logo da empresa (aparece nas telas de agendamento, orçamentos e e-mails)" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    País <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[var(--color-border-strong)] rounded-[var(--radius-control)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] bg-[var(--color-bg)]"
                  >
                    {MARKETS.map((m) => (
                      <option key={m.code} value={m.code}>{m.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                    Define moeda ({market.currency}) e idioma dos seus clientes.
                  </p>
                </div>

                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    Fuso horário <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <select
                    id="timezone"
                    name="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[var(--color-border-strong)] rounded-[var(--radius-control)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] bg-[var(--color-bg)]"
                  >
                    {market.timezones.map((tz) => (
                      <option key={tz.id} value={tz.id}>{tz.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                    Usado nas agendas e lembretes.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-[var(--color-text)] mb-1">Telefone / Celular</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-[var(--color-border-strong)] rounded-l-lg bg-[var(--color-bg-subtle)] text-sm font-bold text-[var(--color-text-muted)] select-none">
                    {market.dialCode}
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneNumber(e.target.value, country))}
                    placeholder={market.phonePlaceholder}
                    className="w-full px-3 py-2.5 border border-[var(--color-border-strong)] rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                  />
                </div>
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-[var(--color-border-strong)] text-[var(--color-success)] focus:ring-[var(--color-success)]"
                  />
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Este número tem WhatsApp</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Endereço</label>
                <input
                  name="address"
                  placeholder={country === "BR" ? "Rua, número, cidade" : "Street, number, city"}
                  className="w-full px-3 py-2.5 border border-[var(--color-border-strong)] rounded-[var(--radius-control)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                />
              </div>

              {!multiCompanyEnabled && !isAdditionalCompany && (
                <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] p-4">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="enableMultiCompany"
                      checked={multiCompany}
                      onChange={(e) => setMultiCompany(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-[var(--color-border-strong)] text-[var(--color-info)] focus:ring-[var(--color-info)]"
                    />
                    <span className="text-sm text-[var(--color-text)]">
                      Habilitar multiempresas
                      <span className="block text-xs text-[var(--color-text-muted)]">
                        Permite cadastrar mais de uma empresa na mesma conta (ex.: barbearia e mecânica).
                      </span>
                    </span>
                  </label>
                  {multiCompany && (
                    <p className="mt-3 text-xs font-medium text-[var(--color-warning)] bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-[var(--radius-control)] px-3 py-2" role="alert">
                      ⚠ Atenção: a assinatura do plano é cobrada individualmente por
                      empresa. Se um plano custa R$ 10/mês e você tiver 3 empresas,
                      a cobrança total será R$ 30/mês.
                    </p>
                  )}
                </div>
              )}
            </div>

            {state?.success === false && "_" in (state.errors as object) && (
              <p className="mt-4 text-sm text-[var(--color-danger)] bg-[var(--color-danger-light)] rounded-[var(--radius-control)] px-3 py-2">
                {(state.errors as Record<string, string[]>)._?.[0]}
              </p>
            )}

            <div className="mt-6 flex justify-between">
              <button type="button" onClick={back} className="px-5 py-2.5 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors">
                Voltar
              </button>
              <button
                type="submit"
                disabled={pending || !name}
                className="px-5 py-2.5 rounded-[var(--radius-control)] bg-[var(--color-info)] text-white text-sm font-medium disabled:opacity-40 hover:bg-[var(--color-info)] transition-colors"
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
