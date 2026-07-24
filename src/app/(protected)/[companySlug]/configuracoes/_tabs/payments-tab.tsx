"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getCompanyPaymentGatewaysAction,
  updateCompanyPaymentGatewaysAction,
  type CompanyPaymentConfig,
  type PaymentGatewayMethod,
} from "@/server/actions/payment-gateways";
import { toast } from "@/lib/toast-service";
import { CreditCard, DollarSign, CheckCircle2, Globe, Shield } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  canEdit: boolean;
};

export function PaymentsTab({ companySlug, canEdit }: Props) {
  const [config, setConfig] = useState<CompanyPaymentConfig>({
    autoDetectGeo: true,
    activeMethods: [],
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const res = await getCompanyPaymentGatewaysAction(companySlug);
      if (res.success) {
        setConfig(res.config);
      }
    }
    load();
  }, [companySlug]);

  function handleToggleMethod(methodId: string) {
    setConfig({
      ...config,
      activeMethods: config.activeMethods.map((m) =>
        m.id === methodId ? { ...m, enabled: !m.enabled } : m
      ),
    });
  }

  function handleAccountDetailChange(methodId: string, value: string) {
    setConfig({
      ...config,
      activeMethods: config.activeMethods.map((m) =>
        m.id === methodId ? { ...m, accountDetails: value } : m
      ),
    });
  }

  function handleSave() {
    startTransition(async () => {
      const res = await updateCompanyPaymentGatewaysAction(companySlug, config);
      if (res.success) {
        toast.success("Pagamentos Atualizados", res.message);
      } else {
        toast.error("Erro", res.error || "Falha ao salvar métodos de pagamento.");
      }
    });
  }

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Métodos de Pagamento Internacionais & Regionais</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Habilite Pix, Venmo, Zelle, iDEAL e cartões de crédito para os clientes agendarem seus serviços.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs">
            <input
              type="checkbox"
              checked={config.autoDetectGeo}
              onChange={(e) => setConfig({ ...config, autoDetectGeo: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span>Detecção por Geolocalização / Moeda</span>
          </label>
        </div>

        {/* Lista de Gateways Selecionáveis por Região */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.activeMethods.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition-all text-xs space-y-3 ${
                  m.enabled
                    ? "bg-slate-50/80 border-slate-200 shadow-2xs"
                    : "bg-slate-100/40 border-slate-200/60 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                    <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {m.region}
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={m.enabled}
                      onChange={() => handleToggleMethod(m.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                {m.enabled && m.accountDetails !== undefined && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {m.id === "pix"
                        ? "Chave Pix da Empresa (ou QR Code String):"
                        : m.id === "venmo"
                        ? "Usuário Venmo (@handle):"
                        : m.id === "zelle"
                        ? "E-mail ou Telefone Zelle:"
                        : "Dados de Conta / Identificador:"}
                    </label>
                    <input
                      type="text"
                      value={m.accountDetails}
                      onChange={(e) => handleAccountDetailChange(m.id, e.target.value)}
                      placeholder="Informe os dados para recebimento direto..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {canEdit && (
          <div className="pt-4 flex justify-end border-t border-slate-100">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="px-6 py-2.5 bg-[#635bff] hover:bg-[#544dc9] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isPending ? "Salvando..." : "Salvar Configurações de Pagamento"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
