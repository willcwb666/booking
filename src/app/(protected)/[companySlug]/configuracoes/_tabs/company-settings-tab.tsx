"use client";

import React, { useState } from "react";
import { MARKETS, getMarket, findMarketByTimezone } from "@/lib/markets";
import { LogoUpload } from "@/components/ui/logo-upload";
import { CopyInput } from "@/components/ui/copy-input";
import { setMultiCompanyAction } from "@/server/actions/company";
import { toast } from "@/lib/toast-service";

type Props = {
  companySlug: string;
  canEdit: boolean;
  bookingBaseUrl: string;
  multiCompany: boolean;
  formState: {
    name: string;
    phone: string;
    address: string;
    country: string;
    timezone: string;
    logoUrl: string | null;
  };
  onChange: (field: string, value: any) => void;
};

export function CompanySettingsTab({
  companySlug,
  canEdit,
  bookingBaseUrl,
  multiCompany,
  formState,
  onChange,
}: Props) {
  const [multiCompEnabled, setMultiCompEnabled] = useState(multiCompany);
  const [multiCompPending, setMultiCompPending] = useState(false);

  const initialMarket =
    findMarketByTimezone(formState.timezone) ??
    MARKETS.find((m) => m.code === formState.country) ??
    MARKETS[0];

  const market = getMarket(formState.country || initialMarket.code) ?? MARKETS[0];

  function handleCountryChange(code: string) {
    onChange("country", code);
    const m = getMarket(code);
    if (m && !m.timezones.some((t) => t.id === formState.timezone)) {
      onChange("timezone", m.timezones[0].id);
    }
  }

  const appUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${bookingBaseUrl}`
      : bookingBaseUrl;

  async function handleToggleMultiCompany(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    setMultiCompPending(true);
    const res = await setMultiCompanyAction(next);
    setMultiCompPending(false);

    if (res.success) {
      setMultiCompEnabled(next);
      toast.success("Atualizado", next ? "Modo multiempresas ativado!" : "Modo multiempresas desativado.");
    } else {
      toast.error("Atenção", res.errors?._?.[0] || "Falha ao alterar modo multiempresas");
    }
  }

  return (
    <div className="space-y-6 text-left">
      {/* Link público de agendamento */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-3 shadow-sm">
        <h2 className="text-base font-bold text-stone-900">Link Público de Agendamento</h2>
        <p className="text-xs text-stone-500">
          Compartilhe este link com seus clientes para que possam agendar serviços online 24/7.
        </p>
        <CopyInput value={appUrl} label="Link exclusivo da empresa" />
      </div>

      {/* Formulário de Dados */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <h2 className="text-base font-bold text-stone-900">Dados Principais da Empresa</h2>

        {!canEdit && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Apenas o Proprietário (OWNER) ou Gerente (MANAGER) podem alterar estes dados.
          </div>
        )}

        <LogoUpload
          initialUrl={formState.logoUrl}
          onUploadComplete={(url) => onChange("logoUrl", url)}
          disabled={!canEdit}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-xs font-bold text-stone-700 mb-1">
              Nome da empresa *
            </label>
            <input
              id="name"
              value={formState.name}
              onChange={(e) => onChange("name", e.target.value)}
              required
              disabled={!canEdit}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-bold text-stone-700 mb-1">Telefone Principal</label>
            <input
              id="phone"
              value={formState.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              disabled={!canEdit}
              placeholder="(00) 00000-0000"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-xs font-bold text-stone-700 mb-1">Endereço Comercial</label>
          <input
            id="address"
            value={formState.address}
            onChange={(e) => onChange("address", e.target.value)}
            disabled={!canEdit}
            placeholder="Rua, Número, Bairro - Cidade, Estado"
            className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
          <div>
            <label htmlFor="country" className="block text-xs font-bold text-stone-700 mb-1">País</label>
            <select
              id="country"
              value={formState.country || market.code}
              onChange={(e) => handleCountryChange(e.target.value)}
              disabled={!canEdit}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-stone-50"
            >
              {MARKETS.map((m) => (
                <option key={m.code} value={m.code}>{m.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-stone-400">
              Moeda: {market.currency} · Idioma: {market.locale}
            </p>
          </div>

          <div>
            <label htmlFor="timezone" className="block text-xs font-bold text-stone-700 mb-1">Fuso horário</label>
            <select
              id="timezone"
              value={formState.timezone}
              onChange={(e) => onChange("timezone", e.target.value)}
              disabled={!canEdit}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-stone-50"
            >
              {market.timezones.map((tz) => (
                <option key={tz.id} value={tz.id}>{tz.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-stone-400">Usado nas agendas e lembretes.</p>
          </div>
        </div>
      </div>

      {/* Seção Modo Multiempresas */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Modo Multiempresas</h2>
            <p className="text-xs text-stone-500">
              Permite cadastrar e gerenciar múltiplas empresas em um único login. Cada empresa possui cobrança individual.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={multiCompEnabled}
              onChange={handleToggleMultiCompany}
              disabled={multiCompPending}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>
      </div>
    </div>
  );
}
