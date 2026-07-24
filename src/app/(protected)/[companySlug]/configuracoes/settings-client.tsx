"use client";

import { useActionState, useState, useTransition } from "react";
import { updateCompanyAction, setMultiCompanyAction } from "@/server/actions/company";
import { createPlanCheckoutAction, createBillingPortalAction } from "@/server/actions/subscription";
import { formatMoney } from "@/lib/format";
import {
  addPaymentMethodAction,
  togglePaymentMethodAction,
  removePaymentMethodAction,
} from "@/server/actions/payment-methods";
import type { ActionResult } from "@/types";
import { useCompany } from "@/lib/company-context";
import { MARKETS, getMarket, findMarketByTimezone } from "@/lib/markets";
import { LogoUpload } from "@/components/ui/logo-upload";

type PaymentMethodItem = {
  id: string;
  kind: "STRIPE_CARD" | "MERCADOPAGO_PIX" | "MANUAL";
  label: string;
  handle: string | null;
  instructions: string | null;
  isActive: boolean;
};

type Props = {
  companySlug: string;
  canEdit: boolean;
  initial: {
    name: string;
    phone: string;
    address: string;
    timezone: string;
    currency: string;
    locale: string;
    logoUrl: string | null;
  };
  bookingBaseUrl: string;
  paymentMethods: PaymentMethodItem[];
  multiCompany: boolean;
  billing: BillingData;
};

type BillingPlan = {
  id: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  billable: boolean;
};

type BillingData = {
  isOwner: boolean;
  currency: string;
  currentPlanId: string;
  subscriptionStatus: string | null;
  subscriptionInterval: string | null;
  subscriptionPeriodEnd: string | null;
  hasCustomer: boolean;
  plans: BillingPlan[];
};

type Tab = "empresa" | "pagamentos" | "plano";

// ─── Tab: Empresa ─────────────────────────────────────────────────────────────

function EmpresaTab({
  companySlug,
  canEdit,
  initial,
  bookingBaseUrl,
}: Omit<Props, "paymentMethods" | "multiCompany" | "billing">) {
  const company = useCompany();
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    updateCompanyAction,
    null
  );
  const [copied, setCopied] = useState(false);

  // País derivado do fuso salvo (fallback: primeiro mercado com o locale da empresa)
  const initialMarket =
    findMarketByTimezone(initial.timezone) ??
    MARKETS.find((m) => m.locale === initial.locale) ??
    MARKETS[0];
  const [country, setCountry] = useState(initialMarket.code);
  const [timezone, setTimezone] = useState(initial.timezone);
  const market = getMarket(country) ?? MARKETS[0];

  function handleCountryChange(code: string) {
    setCountry(code);
    const m = getMarket(code);
    if (m && !m.timezones.some((t) => t.id === timezone)) {
      setTimezone(m.timezones[0].id);
    }
  }

  const appUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${bookingBaseUrl}`
      : bookingBaseUrl;

  function handleCopy() {
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const errors = result && !result.success ? result.errors : {};
  const saved = result?.success === true;

  return (
    <div className="space-y-5">
      {/* Booking link */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Link público de agendamento</h2>
        <p className="text-xs text-gray-500 mb-3">
          Compartilhe este link com seus clientes para que possam agendar serviços.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={appUrl}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50 focus:outline-none"
            aria-label="Link público de agendamento"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Dados da empresa</h2>

        {!canEdit && (
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
            Apenas OWNER e MANAGER podem editar os dados da empresa.
          </p>
        )}

        <form action={action} className="space-y-4">
          <input type="hidden" name="companySlug" value={companySlug} />

          <LogoUpload initialUrl={initial.logoUrl} disabled={!canEdit} />

          <div>
            <label htmlFor="name" className="block text-xs text-gray-600 mb-1">
              Nome da empresa <span aria-hidden="true">*</span>
            </label>
            <input
              id="name"
              name="name"
              defaultValue={initial.name}
              required
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs text-gray-600 mb-1">Telefone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={initial.phone}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-xs text-gray-600 mb-1">Endereço</label>
            <input
              id="address"
              name="address"
              defaultValue={initial.address}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="country" className="block text-xs text-gray-600 mb-1">País</label>
              <select
                id="country"
                name="country"
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                disabled={!canEdit}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
              >
                {MARKETS.map((m) => (
                  <option key={m.code} value={m.code}>{m.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                Moeda: {market.currency} · Idioma: {market.locale}
              </p>
            </div>
            <div>
              <label htmlFor="timezone" className="block text-xs text-gray-600 mb-1">Fuso horário</label>
              <select
                id="timezone"
                name="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!canEdit}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
              >
                {market.timezones.map((tz) => (
                  <option key={tz.id} value={tz.id}>{tz.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">Usado nas agendas e lembretes.</p>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Slug (URL): <span className="font-mono text-gray-600">/{company.slug}</span>
            <span className="ml-1">(não editável)</span>
          </p>

          {errors._ && <p role="alert" className="text-sm text-red-600">{errors._[0]}</p>}
          {saved && <p role="status" className="text-sm text-green-700">Dados salvos com sucesso.</p>}

          {canEdit && (
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {pending ? "Salvando…" : "Salvar alterações"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Multiempresas ────────────────────────────────────────────────────────────

function MultiEmpresaSection({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleToggle(next: boolean) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setMultiCompanyAction(next);
      if (result.success) {
        setEnabled(next);
        setSaved(true);
      } else {
        setError(result.errors._?.[0] ?? "Erro ao salvar");
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mt-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Multiempresas</h2>
      <p className="text-xs text-gray-500 mb-4">
        Cadastre mais de uma empresa na mesma conta (ex.: barbearia e mecânica),
        cada uma com seu próprio ambiente, agenda e equipe.
      </p>

      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => handleToggle(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">
          Habilitar multiempresas
          {enabled && (
            <span className="block text-xs text-gray-500 mt-0.5">
              A opção &quot;Criar empresa&quot; aparece no menu lateral.
            </span>
          )}
        </span>
      </label>

      {enabled && (
        <p className="mt-3 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2" role="alert">
          ⚠ Atenção: a assinatura do plano é cobrada individualmente por empresa.
          Se um plano custa R$ 10/mês e você tiver 3 empresas, a cobrança total
          será R$ 30/mês.
        </p>
      )}

      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {saved && <p role="status" className="mt-2 text-sm text-green-700">Preferência salva!</p>}
    </div>
  );
}

// ─── Tab: Plano ───────────────────────────────────────────────────────────────

const SUB_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Ativa", className: "bg-emerald-100 text-emerald-700" },
  trialing: { label: "Em teste", className: "bg-blue-100 text-blue-700" },
  past_due: { label: "Pagamento atrasado", className: "bg-amber-100 text-amber-700" },
  unpaid: { label: "Não paga", className: "bg-red-100 text-red-700" },
  canceled: { label: "Cancelada", className: "bg-gray-100 text-gray-600" },
};

function PlanoTab({ companySlug, billing }: { companySlug: string; billing: BillingData }) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentPlan = billing.plans.find((p) => p.id === billing.currentPlanId);
  const hasActiveSub =
    billing.subscriptionStatus === "active" || billing.subscriptionStatus === "trialing";
  const statusInfo = billing.subscriptionStatus
    ? SUB_STATUS[billing.subscriptionStatus] ?? { label: billing.subscriptionStatus, className: "bg-gray-100 text-gray-600" }
    : null;

  function price(plan: BillingPlan) {
    const value = interval === "year" ? plan.priceYearly / 12 : plan.priceMonthly;
    return formatMoney(value, billing.currency, billing.currency === "brl" ? "pt-BR" : "en-US");
  }

  function subscribe(planId: string) {
    if (!billing.isOwner) return;
    setError(null);
    startTransition(async () => {
      const result = await createPlanCheckoutAction(companySlug, planId, interval);
      if (result.success) window.location.href = result.url;
      else setError(result.error);
    });
  }

  function openPortal() {
    setError(null);
    startTransition(async () => {
      const result = await createBillingPortalAction(companySlug);
      if (result.success) window.location.href = result.url;
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-5">
      {/* Plano atual */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Plano atual</h2>
          {statusInfo && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">{currentPlan?.displayName ?? "—"}</p>
        {currentPlan?.description && (
          <p className="text-sm text-gray-500 mt-0.5">{currentPlan.description}</p>
        )}
        {billing.subscriptionPeriodEnd && hasActiveSub && (
          <p className="text-xs text-gray-400 mt-2">
            Renova em {new Date(billing.subscriptionPeriodEnd).toLocaleDateString("pt-BR")}
            {billing.subscriptionInterval === "year" ? " (anual)" : " (mensal)"}
          </p>
        )}
        {!hasActiveSub && (
          <p className="text-xs text-amber-700 mt-2">
            Sem assinatura ativa. Escolha um plano abaixo para ativar a cobrança.
          </p>
        )}

        {billing.hasCustomer && billing.isOwner && (
          <button
            type="button"
            onClick={openPortal}
            disabled={pending}
            className="mt-4 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            Gerenciar assinatura e faturas
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {!billing.isOwner && (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          Apenas o dono (OWNER) da empresa pode gerenciar a assinatura.
        </p>
      )}

      {/* Escolher plano */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Planos disponíveis</h2>
          <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setInterval("month")}
              className={`px-3 py-1 rounded-md font-medium ${interval === "month" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setInterval("year")}
              className={`px-3 py-1 rounded-md font-medium ${interval === "year" ? "bg-white shadow-sm text-gray-900" : "text-gray-500"}`}
            >
              Anual
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {billing.plans.map((plan) => {
            const isCurrent = plan.id === billing.currentPlanId && hasActiveSub;
            const isFree = plan.priceMonthly <= 0 && plan.priceYearly <= 0;
            return (
              <div
                key={plan.id}
                className={`flex items-center justify-between gap-3 p-4 rounded-lg border ${
                  isCurrent ? "border-blue-300 bg-blue-50/50" : "border-gray-200"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{plan.displayName}</p>
                  <p className="text-xs text-gray-500">
                    {isFree ? "Grátis" : `${price(plan)} / mês${interval === "year" ? " (cobrado anualmente)" : ""}`}
                  </p>
                </div>
                {isCurrent ? (
                  <span className="text-xs font-medium text-blue-700 shrink-0">Plano atual</span>
                ) : isFree ? (
                  <span className="text-xs text-gray-400 shrink-0">—</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => subscribe(plan.id)}
                    disabled={pending || !billing.isOwner || !plan.billable}
                    title={!plan.billable ? "Plano ainda não sincronizado com o Stripe" : undefined}
                    className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0"
                  >
                    {hasActiveSub ? "Trocar para este" : "Assinar"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Pagamento processado com segurança pelo Stripe. No modo multiempresas, cada
          empresa tem sua própria assinatura, cobrada individualmente.
        </p>
      </div>
    </div>
  );
}

// ─── Tab: Pagamentos ──────────────────────────────────────────────────────────

const KIND_BADGES: Record<PaymentMethodItem["kind"], { label: string; className: string }> = {
  STRIPE_CARD: { label: "Automático · Stripe", className: "bg-violet-100 text-violet-700" },
  MERCADOPAGO_PIX: { label: "Automático · Mercado Pago", className: "bg-sky-100 text-sky-700" },
  MANUAL: { label: "Confirmação manual", className: "bg-gray-100 text-gray-600" },
};

function PagamentosTab({
  companySlug,
  canEdit,
  paymentMethods,
}: {
  companySlug: string;
  canEdit: boolean;
  paymentMethods: PaymentMethodItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKind, setNewKind] = useState<PaymentMethodItem["kind"]>("MANUAL");

  function run(action: () => Promise<{ success: boolean } & { error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) setError(result.error ?? "Erro ao salvar");
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await addPaymentMethodAction(data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      form.reset();
      setShowAddForm(false);
      setNewKind("MANUAL");
    });
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Formas de pagamento</h2>
        <p className="text-xs text-gray-500 mb-5">
          Métodos automáticos são confirmados pelo gateway. Métodos manuais (dinheiro,
          PIX por chave, Zelle, Venmo…) você confirma no detalhe do agendamento.
        </p>

        {!canEdit && (
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
            Apenas OWNER e MANAGER podem alterar as configurações de pagamento.
          </p>
        )}

        {/* Lista de métodos */}
        <ul className="space-y-3 mb-5">
          {paymentMethods.length === 0 && (
            <li className="text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl p-4 text-center">
              Nenhuma forma de pagamento configurada.
            </li>
          )}
          {paymentMethods.map((m) => (
            <li
              key={m.id}
              className={`flex items-start gap-4 p-4 rounded-xl border ${
                m.isActive ? "border-gray-200" : "border-gray-100 bg-gray-50 opacity-70"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{m.label}</p>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${KIND_BADGES[m.kind].className}`}>
                    {KIND_BADGES[m.kind].label}
                  </span>
                  {!m.isActive && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      Desativado
                    </span>
                  )}
                </div>
                {m.handle && (
                  <p className="text-xs font-mono text-gray-600 mt-1 break-all">{m.handle}</p>
                )}
                {m.instructions && (
                  <p className="text-xs text-gray-500 mt-0.5">{m.instructions}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => togglePaymentMethodAction(m.id, companySlug))}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {m.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removePaymentMethodAction(m.id, companySlug))}
                    className="text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

        {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}

        {/* Adicionar método */}
        {canEdit && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            + Adicionar forma de pagamento
          </button>
        )}

        {canEdit && showAddForm && (
          <form onSubmit={handleAdd} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
            <input type="hidden" name="companySlug" value={companySlug} />

            <div>
              <label htmlFor="pm-kind" className="block text-xs text-gray-600 mb-1">Tipo</label>
              <select
                id="pm-kind"
                name="kind"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as PaymentMethodItem["kind"])}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MANUAL">Manual — Zelle, Venmo, PIX por chave, dinheiro…</option>
                <option value="STRIPE_CARD">Cartão online (Stripe)</option>
                <option value="MERCADOPAGO_PIX">PIX automático (Mercado Pago)</option>
              </select>
            </div>

            <div>
              <label htmlFor="pm-label" className="block text-xs text-gray-600 mb-1">
                Nome exibido no checkout <span aria-hidden="true">*</span>
              </label>
              <input
                id="pm-label"
                name="label"
                required
                maxLength={60}
                placeholder={newKind === "MANUAL" ? "Ex.: Zelle, Venmo, PIX, Dinheiro" : "Ex.: Cartão de crédito/débito"}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {newKind === "MANUAL" && (
              <>
                <div>
                  <label htmlFor="pm-handle" className="block text-xs text-gray-600 mb-1">
                    Identificador para o cliente pagar (opcional)
                  </label>
                  <input
                    id="pm-handle"
                    name="handle"
                    maxLength={200}
                    placeholder="Chave PIX, e-mail/telefone Zelle, @usuario Venmo…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="pm-instructions" className="block text-xs text-gray-600 mb-1">
                    Instruções (opcional)
                  </label>
                  <textarea
                    id="pm-instructions"
                    name="instructions"
                    rows={2}
                    maxLength={500}
                    placeholder="Ex.: Envie o pagamento e apresente o comprovante no dia do serviço."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {pending ? "Salvando…" : "Adicionar"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setError(null); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function SettingsClient({
  companySlug,
  canEdit,
  initial,
  bookingBaseUrl,
  paymentMethods,
  multiCompany,
  billing,
}: Props) {
  const [tab, setTab] = useState<Tab>("empresa");

  const tabs: { id: Tab; label: string }[] = [
    { id: "empresa", label: "Empresa" },
    { id: "plano", label: "Plano" },
    { id: "pagamentos", label: "Formas de pagamento" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "empresa" && (
        <>
          <EmpresaTab
            companySlug={companySlug}
            canEdit={canEdit}
            initial={initial}
            bookingBaseUrl={bookingBaseUrl}
          />
          <MultiEmpresaSection initialEnabled={multiCompany} />
        </>
      )}

      {tab === "plano" && <PlanoTab companySlug={companySlug} billing={billing} />}

      {tab === "pagamentos" && (
        <PagamentosTab
          companySlug={companySlug}
          canEdit={canEdit}
          paymentMethods={paymentMethods}
        />
      )}
    </div>
  );
}
