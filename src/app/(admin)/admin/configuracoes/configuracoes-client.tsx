"use client";

import React, { useState, useEffect, useTransition } from "react";
import { updatePlatformSettingsAction } from "@/server/actions/admin-settings";
import type { PlatformSettingsData } from "@/lib/platform-settings";
import { broadcastPlatformUpdatesAction } from "@/server/actions/broadcast-updates";
import { getPlatformAuditLogsAction, type AuditLogItem } from "@/server/actions/audit";
import { toast } from "@/lib/toast-service";
import { PageHeader } from "@/components/ui/page-header";
import {
  Settings,
  DollarSign,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
  Bell,
  FileText,
} from "@/components/ui/icons";

type Props = {
  initialSettings: PlatformSettingsData;
};

type Tab = "global" | "maintenance" | "broadcast" | "audit";

export function AdminConfiguracoesClient({ initialSettings }: Props) {
  const [tab, setTab] = useState<Tab>("global");
  const [settings, setSettings] = useState<PlatformSettingsData>(initialSettings);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isPending, startTransition] = useTransition();

  // Form de Disparo de Melhorias
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastDescription, setBroadcastDescription] = useState("");
  const [broadcastChannels, setBroadcastChannels] = useState({
    systemNotification: true,
    email: true,
  });

  /**
   * Os campos desta tela editam estado local e só vão para o banco quando
   * alguém clica em salvar. Sem nenhum aviso, dava para mexer em taxa,
   * carência e política de sessão, trocar de aba ou fechar a página e perder
   * tudo em silêncio — e nesta tela o que se perde é configuração de cobrança.
   */
  const hasUnsavedChanges =
    JSON.stringify(settings) !== JSON.stringify(initialSettings);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function warn(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    async function loadAuditLogs() {
      const res = await getPlatformAuditLogsAction();
      if (res.success) {
        setAuditLogs(res.logs);
      }
    }
    if (tab === "audit") {
      loadAuditLogs();
    }
  }, [tab]);

  function handleSaveSettings() {
    startTransition(async () => {
      const res = await updatePlatformSettingsAction(settings);
      if (res.success) {
        toast.success("Salvo!", res.message || "Configurações globais atualizadas com sucesso.");
      } else {
        toast.error("Erro", res.error || "Falha ao salvar configurações.");
      }
    });
  }

  function handleBroadcastSubmit() {
    if (!broadcastTitle.trim() || !broadcastDescription.trim()) {
      toast.error("Atenção", "Preencha o título e a descrição das melhorias.");
      return;
    }

    startTransition(async () => {
      const res = await broadcastPlatformUpdatesAction({
        title: broadcastTitle,
        description: broadcastDescription,
        channels: broadcastChannels,
      });

      if (res.success) {
        toast.success("Disparado!", res.message || "Melhorias enviadas aos administradores.");
        setBroadcastTitle("");
        setBroadcastDescription("");
      } else {
        toast.error("Erro", res.error || "Falha ao disparar atualizações.");
      }
    });
  }

  return (
    <div className="page-content space-y-8 pb-20">
      <PageHeader
        category="Plataforma"
        categoryIcon={<Settings className="w-3.5 h-3.5" />}
        title="Configurações"
        description="Parâmetros operacionais, janela de manutenção, anúncios e trilha de auditoria."
        action={
          hasUnsavedChanges ? (
            <div className="flex items-center gap-3">
              <span className="badge badge-warning">Alterações não salvas</span>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isPending}
                className="btn btn-primary btn-sm"
              >
                {isPending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="scroller -mx-1 px-1">
        <div className="segmented w-max" role="tablist" aria-label="Seções">
          {(
            [
              { id: "global" as const, label: "Gerais" },
              { id: "maintenance" as const, label: "Manutenção" },
              { id: "broadcast" as const, label: "Anúncios" },
              { id: "audit" as const, label: "Auditoria" },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              data-active={tab === t.id}
              onClick={() => setTab(t.id)}
              className="segmented-item whitespace-nowrap"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ABA 1: CONFIGURAÇÕES GLOBAIS & TAXAS */}
      {tab === "global" && (
        <div className="space-y-6">
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)]/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
              <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]/20">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-heading)]">Parâmetros Operacionais da Plataforma</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Configure dias de degustação, prazos de carência e taxas administrativas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Taxa de Reset */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Taxa de Reset de Presets (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.presetResetFee}
                    onChange={(e) => setSettings({ ...settings, presetResetFee: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1 block">
                  Cobrado via Stripe ao solicitar a reconfiguração do catálogo.
                </span>
              </div>

              {/* Dias de Trial Grátis */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Dias de Teste Grátis (Trial Period)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.trialDays}
                  onChange={(e) => setSettings({ ...settings, trialDays: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1 block">
                  Período de degustação sem cobrança para novas empresas.
                </span>
              </div>

              {/* Dias de Carência para Inadimplência */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Tolerância de Inadimplência (Dias de Carência)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.gracePeriodDays}
                  onChange={(e) => setSettings({ ...settings, gracePeriodDays: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1 block">
                  Dias adicionais antes da conta ser suspensa após o vencimento do Stripe.
                </span>
              </div>

              {/* Permitir Auto-Cadastro Público */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Auto-Cadastro de Novas Empresas
                </label>
                <select
                  value={settings.selfRegistrationEnabled ? "true" : "false"}
                  onChange={(e) => setSettings({ ...settings, selfRegistrationEnabled: e.target.value === "true" })}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="true">Habilitado (Novas empresas podem se cadastrar livremente)</option>
                  <option value="false">Deshabilitado (Apenas criação manual/onboarding)</option>
                </select>
              </div>

              {/* Nome Oficial da Plataforma */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Nome Oficial da Plataforma
                </label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/* E-mail de Suporte */}
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  E-mail Oficial de Suporte
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isPending}
                className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs rounded-[var(--radius-control)] shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isPending ? "Salvando..." : "Salvar Configurações Globais"}</span>
              </button>
            </div>
          </div>

          {/* Política de Sessão */}
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)]/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
              <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-heading)]">
                  Política de Sessão &amp; Acesso
                </h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Desconexão automática por inatividade e limite de logins simultâneos. Use 0 para
                  desligar um timeout.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Inatividade — Painel (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={settings.sessionIdleStaffMinutes}
                  onChange={(e) =>
                    setSettings({ ...settings, sessionIdleStaffMinutes: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1 block">
                  Vale para donos, gerentes, funcionários e super admins. Padrão: 5 minutos.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Inatividade — Cliente final (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1440"
                  value={settings.sessionIdleCustomerMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sessionIdleCustomerMinutes: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1 block">
                  Quem só consulta os próprios agendamentos. Padrão: 60 minutos.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Inatividade — App mobile (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10080"
                  value={settings.sessionIdleMobileMinutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sessionIdleMobileMinutes: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1 block">
                  0 = desligado. O app tem ciclo de vida próprio e não é afetado pelo painel.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Login simultâneo no navegador
                </label>
                <select
                  value={settings.singleWebSessionEnabled ? "true" : "false"}
                  onChange={(e) =>
                    setSettings({ ...settings, singleWebSessionEnabled: e.target.value === "true" })
                  }
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="true">Bloqueado (o novo login derruba a máquina anterior)</option>
                  <option value="false">Permitido (várias máquinas ao mesmo tempo)</option>
                </select>
                <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-1 block">
                  Sessões do app mobile nunca são derrubadas por esta regra.
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isPending}
                className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs rounded-[var(--radius-control)] shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isPending ? "Salvando..." : "Salvar Política de Sessão"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: MANUTENÇÃO PROGRAMADA */}
      {tab === "maintenance" && (
        <div className="space-y-6">
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)]/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-warning-light)] text-[var(--color-warning)] flex items-center justify-center shrink-0 border border-[var(--color-warning-border)]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-text-heading)]">Aviso & Janela de Manutenção Programada</h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Programe alertas para todas as empresas e clientes durante atualizações críticas de banco de dados.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceEnabled}
                  onChange={(e) => setSettings({ ...settings, maintenanceEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--color-bg-muted)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-bg)] after:border-[var(--color-border-strong)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-warning)]" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Impacto no Sistema
                </label>
                <select
                  value={settings.maintenanceImpact}
                  onChange={(e) => setSettings({ ...settings, maintenanceImpact: e.target.value as typeof settings.maintenanceImpact })}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="SLOW">Lento (Degradação de Desempenho)</option>
                  <option value="UNAVAILABLE">Indisponível (Fora do Ar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Data / Hora Inicial
                </label>
                <input
                  type="datetime-local"
                  value={settings.maintenanceStart}
                  onChange={(e) => setSettings({ ...settings, maintenanceStart: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Data / Hora Final (Previsão)
                </label>
                <input
                  type="datetime-local"
                  value={settings.maintenanceEnd}
                  onChange={(e) => setSettings({ ...settings, maintenanceEnd: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                Mensagem Personalizada aos Usuários
              </label>
              <textarea
                rows={3}
                value={settings.maintenanceMessage}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                className="w-full p-3.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-medium text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="Ex: Estamos realizando uma manutenção programada nos servidores de banco de dados para melhorar a velocidade das reservas."
              />
            </div>

            {/* Live Preview do Banner */}
            {settings.maintenanceEnabled && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-[var(--color-text)] block">Pré-visualização ao Vivo do Banner:</span>
                <div
                  className={`p-4 rounded-[var(--radius-card)] text-xs font-bold flex items-center justify-between gap-4 ${
                    settings.maintenanceImpact === "UNAVAILABLE"
                      ? "bg-[var(--color-danger)] text-white"
                      : "bg-[var(--color-warning)] text-[var(--color-text-heading)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{settings.maintenanceMessage}</span>
                  </div>
                  <span className="text-[var(--text-2xs)] opacity-80 shrink-0">
                    {settings.maintenanceStart && `Início: ${settings.maintenanceStart}`}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isPending}
                className="px-6 py-2.5 bg-[var(--color-warning)] hover:bg-[var(--color-warning)] text-white font-bold text-xs rounded-[var(--radius-control)] shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{isPending ? "Salvando..." : "Salvar Janela de Manutenção"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: DISPARO DE MELHORIAS (RELEASE NOTES BROADCAST) */}
      {tab === "broadcast" && (
        <div className="space-y-6">
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)]/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
              <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-warning-light)] text-[var(--color-warning)] flex items-center justify-center shrink-0 border border-[var(--color-warning-border)]">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-heading)]">Disparo de Novidades & Melhorias (Release Broadcast)</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Anuncie novas funcionalidades implementadas diretamente para todos os administradores das empresas cadastradas.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Título da Release / Melhoria
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ex: Nova Dashboard com Design Stripe, Notificações por WhatsApp e Modais de Reset"
                  className="w-full px-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text)] mb-1">
                  Descrição Completa das Melhorias Implementadas
                </label>
                <textarea
                  rows={5}
                  value={broadcastDescription}
                  onChange={(e) => setBroadcastDescription(e.target.value)}
                  placeholder="Descreva aqui todas as novas funções lançadas na plataforma para engajar os clientes..."
                  className="w-full p-3.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-xs font-medium text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              {/*
                O canal "WhatsApp / Texto" saiu daqui. A integração não existe
                no projeto: marcar a caixa fazia o payload registrar o canal no
                log de auditoria e a tela dizer "disparado com sucesso" sem que
                nenhuma mensagem saísse. Voltará junto com o envio.
              */}
              <fieldset className="p-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-card)] space-y-3">
                <legend className="eyebrow mb-1">Canais</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 p-3 bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastChannels.systemNotification}
                      onChange={(e) =>
                        setBroadcastChannels({
                          ...broadcastChannels,
                          systemNotification: e.target.checked,
                        })
                      }
                      className="w-4 h-4 mt-0.5 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-heading)]">
                        <Bell className="w-3.5 h-3.5 text-[var(--color-text-subtle)]" />
                        Sino do painel
                      </span>
                      <span
                        className="block text-[var(--color-text-muted)]"
                        style={{ fontSize: "var(--text-xs)" }}
                      >
                        Aparece para todos dentro do sistema
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={broadcastChannels.email}
                      onChange={(e) =>
                        setBroadcastChannels({ ...broadcastChannels, email: e.target.checked })
                      }
                      className="w-4 h-4 mt-0.5 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-heading)]">
                        <Mail className="w-3.5 h-3.5 text-[var(--color-text-subtle)]" />
                        E-mail
                      </span>
                      <span
                        className="block text-[var(--color-text-muted)]"
                        style={{ fontSize: "var(--text-xs)" }}
                      >
                        Só para o responsável de cada empresa ativa
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              {!broadcastChannels.systemNotification && !broadcastChannels.email && (
                <span
                  className="text-[var(--color-text-muted)]"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  Escolha ao menos um canal.
                </span>
              )}
              <button
                type="button"
                onClick={handleBroadcastSubmit}
                disabled={
                  isPending ||
                  (!broadcastChannels.systemNotification && !broadcastChannels.email)
                }
                className="btn btn-primary btn-sm"
              >
                {isPending ? "Enviando…" : "Enviar anúncio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: AUDIT LOGS DO SISTEMA */}
      {tab === "audit" && (
        <div className="space-y-6">
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)]/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5">
              <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-heading)]">Rastreabilidade & Logs de Auditoria</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Registro cronológico de todas as ações administrativas e operacionais da plataforma.
                </p>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-subtle)]">
                Nenhum log registrado recentemente.
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)] overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-bold">
                      <th className="px-3 py-2 text-left">Ação</th>
                      <th className="px-3 py-2 text-left">Entidade</th>
                      <th className="px-3 py-2 text-left">IP</th>
                      <th className="px-3 py-2 text-left">Data / Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)] font-mono">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--color-bg-subtle)]">
                        <td className="px-3 py-2.5 font-bold text-[var(--color-text-heading)]">{log.action}</td>
                        <td className="px-3 py-2.5 text-[var(--color-text-muted)]">{log.entity}</td>
                        <td className="px-3 py-2.5 text-[var(--color-text-subtle)]">{log.ipAddress || "localhost"}</td>
                        <td className="px-3 py-2.5 text-[var(--color-text-muted)]">{log.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
