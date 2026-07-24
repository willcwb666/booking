"use client";

import React, { useState, useTransition } from "react";
import { CompanySettingsTab } from "./_tabs/company-settings-tab";
import { LandingTab } from "./landing-tab";
import { NotificationsTab } from "./_tabs/notifications-tab";
import { CancellationTab } from "./_tabs/cancellation-tab";
import { ResetTab } from "./_tabs/reset-tab";
import { PlanoTab } from "./_tabs/plano-tab";
import { PaymentsTab } from "./_tabs/payments-tab";
import { PresetResetRequestModal } from "./_components/preset-reset-request-modal";
import {
  updateCompanySettingsUnifiedAction,
  type UnifiedCompanySettingsPayload,
} from "@/server/actions/company-settings-unified";
import { toast } from "@/lib/toast-service";
import {
  Building2,
  Palette,
  CreditCard,
  Bell,
  FileText,
  RotateCcw,
  AlertTriangle,
  Globe,
} from "@/components/ui/icons";

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
  availableServices?: Array<{ id: string; name: string }>;
  initial: {
    name: string;
    phone: string;
    address: string;
    country: string;
    timezone: string;
    currency: string;
    locale: string;
    logoUrl: string | null;
    minCancellationNoticeHours: number;
    cancellationFee: number;
    lateToleranceMinutes: number;
    notifyEmailEnabled: boolean;
    notifyTextEnabled: boolean;
    notifySmsEnabled: boolean;
    notifyWhatsappEnabled: boolean;
  };
  initialLanding: {
    heroTitle: string;
    heroSubtitle: string;
    brandColor: string;
    coverImageUrl: string;
    socialInstagram: string;
    socialWhatsapp: string;
    socialFacebook: string;
  };
  bookingBaseUrl: string;
  paymentMethods: PaymentMethodItem[];
  multiCompany: boolean;
  billing: {
    isOwner: boolean;
    currency: string;
    currentPlanId: string;
    subscriptionStatus: string | null;
    subscriptionInterval: string | null;
    subscriptionPeriodEnd: string | null;
    hasCustomer: boolean;
    plans: Array<{
      id: string;
      displayName: string;
      description: string;
      priceMonthly: number;
      priceYearly: number;
      billable: boolean;
    }>;
  };
};

type Tab = "empresa" | "landing" | "pagamentos" | "plano" | "notificacoes" | "cancelamento" | "reset";

export function SettingsClient({
  companySlug,
  canEdit,
  availableServices,
  initial,
  initialLanding,
  bookingBaseUrl,
  multiCompany,
  billing,
}: Props) {
  const [tab, setTab] = useState<Tab>("empresa");
  const [showResetModal, setShowResetModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estado Unificado das Configurações
  const buildPayload = (): UnifiedCompanySettingsPayload => ({
    name: initial.name ?? "",
    phone: initial.phone ?? "",
    address: initial.address ?? "",
    country: initial.country ?? "BR",
    timezone: initial.timezone ?? "America/Sao_Paulo",
    logoUrl: initial.logoUrl ?? null,
    heroTitle: initialLanding?.heroTitle ?? "",
    heroSubtitle: initialLanding?.heroSubtitle ?? "",
    brandColor: initialLanding?.brandColor || "#0f172a",
    coverImageUrl: initialLanding?.coverImageUrl ?? "",
    socialInstagram: initialLanding?.socialInstagram ?? "",
    socialWhatsapp: initialLanding?.socialWhatsapp ?? "",
    socialFacebook: initialLanding?.socialFacebook ?? "",
    notifyEmailEnabled: initial.notifyEmailEnabled ?? true,
    notifyTextEnabled: initial.notifyTextEnabled ?? true,
    notifySmsEnabled: initial.notifySmsEnabled ?? false,
    notifyWhatsappEnabled: initial.notifyWhatsappEnabled ?? true,
    minCancellationNoticeHours: initial.minCancellationNoticeHours ?? 24,
    cancellationFee: initial.cancellationFee ?? 0,
    lateToleranceMinutes: initial.lateToleranceMinutes ?? 15,
  });

  const [formState, setFormState] = useState<UnifiedCompanySettingsPayload>(buildPayload);
  const [initialFormState, setInitialFormState] = useState<UnifiedCompanySettingsPayload>(buildPayload);

  // Botão Salvar Global Habilita apenas se houver mudanças (isDirty)
  const isDirty = JSON.stringify(formState) !== JSON.stringify(initialFormState);

  function handleChange(field: string, value: any) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  function handleGlobalSave() {
    startTransition(async () => {
      const res = await updateCompanySettingsUnifiedAction(companySlug, formState);
      if (res.success) {
        toast.success("Sucesso!", res.message || "Configurações salvas.");
        setInitialFormState(formState);
      } else {
        toast.error("Erro", res.error || "Falha ao salvar configurações.");
      }
    });
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: "empresa", label: "Empresa", icon: <Building2 className="w-4 h-4 shrink-0" /> },
    { id: "landing", label: "Landing Page Pública", icon: <Globe className="w-4 h-4 shrink-0" /> },
    { id: "pagamentos", label: "Métodos de Pagamento", icon: <CreditCard className="w-4 h-4 shrink-0" /> },
    { id: "plano", label: "Plano", icon: <CreditCard className="w-4 h-4 shrink-0" /> },
    { id: "notificacoes", label: "Notificações", icon: <Bell className="w-4 h-4 shrink-0" /> },
    { id: "cancelamento", label: "Política de Cancelamentos", icon: <FileText className="w-4 h-4 shrink-0" /> },
    { id: "reset", label: "Reset de Presets", icon: <RotateCcw className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 w-full max-w-7xl text-left pb-28">
      <PresetResetRequestModal
        companySlug={companySlug}
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />

      {/* Header com Título e Indicador de Mudanças */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Configurações Gerais</h1>
          <p className="text-xs text-slate-500 mt-1">
            Gerencie dados operacionais, comunicação, aparência e assinatura da sua empresa.
          </p>
        </div>

        {isDirty && (
          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Você tem alterações não salvas</span>
          </span>
        )}
      </div>

      {/* Navegação por Abas Organizadas (Estilo Stripe Tab Bar) */}
      <div className="bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60 inline-flex flex-wrap gap-1 mb-8">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer inline-flex items-center gap-2 ${
                isActive
                  ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <span className={isActive ? "text-indigo-600" : "text-slate-400"}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo das Abas */}
      {tab === "empresa" && (
        <CompanySettingsTab
          companySlug={companySlug}
          canEdit={canEdit}
          bookingBaseUrl={bookingBaseUrl}
          multiCompany={multiCompany}
          formState={formState}
          onChange={handleChange}
        />
      )}

      {tab === "landing" && (
        <LandingTab
          companySlug={companySlug}
          canEdit={canEdit}
          availableServices={availableServices || []}
        />
      )}

      {tab === "pagamentos" && (
        <PaymentsTab
          companySlug={companySlug}
          canEdit={canEdit}
        />
      )}

      {tab === "plano" && <PlanoTab companySlug={companySlug} billing={billing} />}

      {tab === "notificacoes" && (
        <NotificationsTab
          canEdit={canEdit}
          formState={formState}
          onChange={handleChange}
        />
      )}

      {tab === "cancelamento" && (
        <CancellationTab
          canEdit={canEdit}
          currency={initial.currency || "BRL"}
          formState={formState}
          onChange={handleChange}
        />
      )}

      {tab === "reset" && (
        <ResetTab
          canEdit={canEdit}
          onRequestReset={() => setShowResetModal(true)}
        />
      )}

      {/* Barra Global de Ação Fixa de Salvar Alterações */}
      {tab !== "plano" && tab !== "reset" && canEdit && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-6 max-w-xl w-full">
          <div className="text-xs">
            <span className="font-bold block text-white">
              {isDirty ? "Campos alterados!" : "Nenhuma alteração pendente"}
            </span>
            <span className="text-slate-400 text-[11px]">
              {isDirty ? "Clique para salvar todas as mudanças efetuadas." : "Altere qualquer campo para habilitar o salvamento."}
            </span>
          </div>

          <button
            type="button"
            onClick={handleGlobalSave}
            disabled={!isDirty || isPending}
            className="px-6 py-2.5 bg-[#635bff] hover:bg-[#544dc9] disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            {isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      )}
    </div>
  );
}
