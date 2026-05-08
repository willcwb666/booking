"use client";

import { useActionState, useState, useTransition } from "react";
import { updateCompanyAction } from "@/server/actions/company";
import { updatePaymentSettingsAction } from "@/server/actions/payment-settings";
import type { ActionResult } from "@/types";
import { useCompany } from "@/lib/company-context";

type PaymentSettings = {
  enableCard: boolean;
  enableCashCheck: boolean;
  enablePix: boolean;
  pixKey: string;
  pixKeyType: string;
};

type Props = {
  companySlug: string;
  canEdit: boolean;
  initial: { name: string; phone: string; address: string };
  bookingBaseUrl: string;
  paymentSettings: PaymentSettings;
};

type Tab = "empresa" | "pagamentos";

// ─── Tab: Empresa ─────────────────────────────────────────────────────────────

function EmpresaTab({
  companySlug,
  canEdit,
  initial,
  bookingBaseUrl,
}: Omit<Props, "paymentSettings">) {
  const company = useCompany();
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    updateCompanyAction,
    null
  );
  const [copied, setCopied] = useState(false);

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

// ─── Tab: Pagamentos ──────────────────────────────────────────────────────────

function PagamentosTab({
  companySlug,
  canEdit,
  paymentSettings,
}: {
  companySlug: string;
  canEdit: boolean;
  paymentSettings: PaymentSettings;
}) {
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enablePix, setEnablePix] = useState(paymentSettings.enablePix);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePaymentSettingsAction(data);
      if (result.success) setSuccess(true);
      else setError(result.error);
    });
  }

  const methods = [
    {
      key: "enableCard",
      label: "Cartão de crédito/débito",
      desc: "Pagamento online via Stripe. Cliente paga na hora do agendamento.",
      defaultChecked: paymentSettings.enableCard,
    },
    {
      key: "enableCashCheck",
      label: "Dinheiro / cheque no dia",
      desc: "Pagamento presencial no momento do serviço. Sem cobrança online.",
      defaultChecked: paymentSettings.enableCashCheck,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Formas de pagamento</h2>
        <p className="text-xs text-gray-500 mb-5">
          Selecione quais formas de pagamento seus clientes poderão utilizar ao agendar.
        </p>

        {!canEdit && (
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
            Apenas OWNER e MANAGER podem alterar as configurações de pagamento.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="companySlug" value={companySlug} />

          {/* Standard methods */}
          {methods.map((m) => (
            <label
              key={m.key}
              className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                name={m.key}
                defaultChecked={m.defaultChecked}
                disabled={!canEdit}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{m.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
              </div>
            </label>
          ))}

          {/* PIX */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <label className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="enablePix"
                checked={enablePix}
                onChange={(e) => setEnablePix(e.target.checked)}
                disabled={!canEdit}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">PIX</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pagamento via PIX. Requer chave PIX configurada abaixo.
                </p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full self-center shrink-0">
                BR
              </span>
            </label>

            {enablePix && (
              <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tipo de chave PIX</label>
                  <select
                    name="pixKeyType"
                    defaultValue={paymentSettings.pixKeyType || ""}
                    disabled={!canEdit}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100"
                  >
                    <option value="">Selecione...</option>
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Chave aleatória</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Chave PIX</label>
                  <input
                    name="pixKey"
                    defaultValue={paymentSettings.pixKey}
                    disabled={!canEdit}
                    placeholder="Digite sua chave PIX"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    A chave será exibida para o cliente realizar o pagamento manualmente.
                    Integração automática via Mercado Pago em breve.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {success && <p role="status" className="text-sm text-green-700">Configurações salvas com sucesso.</p>}

          {canEdit && (
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {pending ? "Salvando…" : "Salvar configurações"}
            </button>
          )}
        </form>
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
  paymentSettings,
}: Props) {
  const [tab, setTab] = useState<Tab>("empresa");

  const tabs: { id: Tab; label: string }[] = [
    { id: "empresa", label: "Empresa" },
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
        <EmpresaTab
          companySlug={companySlug}
          canEdit={canEdit}
          initial={initial}
          bookingBaseUrl={bookingBaseUrl}
        />
      )}

      {tab === "pagamentos" && (
        <PagamentosTab
          companySlug={companySlug}
          canEdit={canEdit}
          paymentSettings={paymentSettings}
        />
      )}
    </div>
  );
}
