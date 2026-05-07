"use client";

import { useActionState, useState } from "react";
import { updateCompanyAction } from "@/server/actions/company";
import type { ActionResult } from "@/types";
import { useCompany } from "@/lib/company-context";

type Props = {
  companySlug: string;
  canEdit: boolean;
  initial: { name: string; phone: string; address: string };
  bookingBaseUrl: string;
};

export function SettingsClient({ companySlug, canEdit, initial, bookingBaseUrl }: Props) {
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
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Dados da empresa</p>
      </div>

      {/* Booking link */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
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
            <label htmlFor="phone" className="block text-xs text-gray-600 mb-1">
              Telefone
            </label>
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
            <label htmlFor="address" className="block text-xs text-gray-600 mb-1">
              Endereço
            </label>
            <input
              id="address"
              name="address"
              defaultValue={initial.address}
              disabled={!canEdit}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div className="pt-1">
            <p className="text-xs text-gray-400 mb-3">
              Slug (URL): <span className="font-mono text-gray-600">/{company.slug}</span>
              <span className="ml-1 text-gray-400">(não editável)</span>
            </p>
          </div>

          {errors._ && (
            <p role="alert" className="text-sm text-red-600">{errors._[0]}</p>
          )}
          {saved && (
            <p role="status" className="text-sm text-green-700">
              Dados salvos com sucesso.
            </p>
          )}

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
