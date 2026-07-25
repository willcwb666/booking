"use client";

import React, { useState, useEffect, useTransition } from "react";
import { updatePlatformSettingsAction, type PlatformSettingsData } from "@/server/actions/admin-settings";
import { broadcastPlatformUpdatesAction } from "@/server/actions/broadcast-updates";
import { getPlatformAuditLogsAction, type AuditLogItem } from "@/server/actions/audit";
import { toast } from "@/lib/toast-service";
import {
  Settings,
  DollarSign,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
  Phone,
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
    whatsapp: false,
  });

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
        toast.success("🚀 Disparado!", res.message || "Melhorias enviadas aos administradores.");
        setBroadcastTitle("");
        setBroadcastDescription("");
      } else {
        toast.error("Erro", res.error || "Falha ao disparar atualizações.");
      }
    });
  }

  return (
    <div className="w-full max-w-7xl text-left space-y-8 pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
          <Settings className="w-4 h-4" />
          <span>Plataforma Super Admin</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
          Configurações Globais do Sistema
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Gerencie parâmetros operacionais, janelas de manutenção, anúncios de melhorias e rastreabilidade.
        </p>
      </div>

      {/* Navegação por Abas no Padrão Stripe Tab Bar */}
      <div className="bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60 inline-flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setTab("global")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            tab === "global"
              ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configurações Globais & Taxas</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("maintenance")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            tab === "maintenance"
              ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Manutenção Programada</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("broadcast")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            tab === "broadcast"
              ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Bell className="w-4 h-4 text-amber-500" />
          <span>🚀 Disparo de Melhorias</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("audit")}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
            tab === "audit"
              ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80 font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📜 Audit Logs do Sistema</span>
        </button>
      </div>

      {/* ABA 1: CONFIGURAÇÕES GLOBAIS & TAXAS */}
      {tab === "global" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Parâmetros Operacionais da Plataforma</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure dias de degustação, prazos de carência e taxas administrativas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Taxa de Reset */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Taxa de Reset de Presets (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.presetResetFee}
                    onChange={(e) => setSettings({ ...settings, presetResetFee: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Cobrado via Stripe ao solicitar a reconfiguração do catálogo.
                </span>
              </div>

              {/* Dias de Trial Grátis */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dias de Teste Grátis (Trial Period)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.trialDays}
                  onChange={(e) => setSettings({ ...settings, trialDays: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Período de degustação sem cobrança para novas empresas.
                </span>
              </div>

              {/* Dias de Carência para Inadimplência */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tolerância de Inadimplência (Dias de Carência)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.gracePeriodDays}
                  onChange={(e) => setSettings({ ...settings, gracePeriodDays: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Dias adicionais antes da conta ser suspensa após o vencimento do Stripe.
                </span>
              </div>

              {/* Permitir Auto-Cadastro Público */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Auto-Cadastro de Novas Empresas
                </label>
                <select
                  value={settings.selfRegistrationEnabled ? "true" : "false"}
                  onChange={(e) => setSettings({ ...settings, selfRegistrationEnabled: e.target.value === "true" })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="true">Habilitado (Novas empresas podem se cadastrar livremente)</option>
                  <option value="false">Deshabilitado (Apenas criação manual/onboarding)</option>
                </select>
              </div>

              {/* Nome Oficial da Plataforma */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome Oficial da Plataforma
                </label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* E-mail de Suporte */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E-mail Oficial de Suporte
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isPending}
                className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isPending ? "Salvando..." : "Salvar Configurações Globais"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: MANUTENÇÃO PROGRAMADA */}
      {tab === "maintenance" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Aviso & Janela de Manutenção Programada</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
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
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Impacto no Sistema
                </label>
                <select
                  value={settings.maintenanceImpact}
                  onChange={(e) => setSettings({ ...settings, maintenanceImpact: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="SLOW">Lento (Degradação de Desempenho)</option>
                  <option value="UNAVAILABLE">Indisponível (Fora do Ar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data / Hora Inicial
                </label>
                <input
                  type="datetime-local"
                  value={settings.maintenanceStart}
                  onChange={(e) => setSettings({ ...settings, maintenanceStart: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data / Hora Final (Previsão)
                </label>
                <input
                  type="datetime-local"
                  value={settings.maintenanceEnd}
                  onChange={(e) => setSettings({ ...settings, maintenanceEnd: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mensagem Personalizada aos Usuários
              </label>
              <textarea
                rows={3}
                value={settings.maintenanceMessage}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Estamos realizando uma manutenção programada nos servidores de banco de dados para melhorar a velocidade das reservas."
              />
            </div>

            {/* Live Preview do Banner */}
            {settings.maintenanceEnabled && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 block">Pré-visualização ao Vivo do Banner:</span>
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-4 ${
                    settings.maintenanceImpact === "UNAVAILABLE"
                      ? "bg-red-600 text-white"
                      : "bg-amber-500 text-slate-950"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{settings.maintenanceMessage}</span>
                  </div>
                  <span className="text-[11px] opacity-80 shrink-0">
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
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
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
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Disparo de Novidades & Melhorias (Release Broadcast)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Anuncie novas funcionalidades implementadas diretamente para todos os administradores das empresas cadastradas.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título da Release / Melhoria
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="Ex: Nova Dashboard com Design Stripe, Notificações por WhatsApp e Modais de Reset"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição Completa das Melhorias Implementadas
                </label>
                <textarea
                  rows={5}
                  value={broadcastDescription}
                  onChange={(e) => setBroadcastDescription(e.target.value)}
                  placeholder="Descreva aqui todas as novas funções lançadas na plataforma para engajar os clientes..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Canais de Disparo */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Canais de Envio Selecionados:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer shadow-2xs">
                    <input
                      type="checkbox"
                      checked={broadcastChannels.systemNotification}
                      onChange={(e) => setBroadcastChannels({ ...broadcastChannels, systemNotification: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">Sino de Notificações</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer shadow-2xs">
                    <input
                      type="checkbox"
                      checked={broadcastChannels.email}
                      onChange={(e) => setBroadcastChannels({ ...broadcastChannels, email: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">E-mail para Admins</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer shadow-2xs">
                    <input
                      type="checkbox"
                      checked={broadcastChannels.whatsapp}
                      onChange={(e) => setBroadcastChannels({ ...broadcastChannels, whatsapp: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">WhatsApp / Texto</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleBroadcastSubmit}
                disabled={isPending}
                className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                <span>🚀 Disparar Novidades para Todos os Admins de Empresas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: AUDIT LOGS DO SISTEMA */}
      {tab === "audit" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Rastreabilidade & Logs de Auditoria</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registro cronológico de todas as ações administrativas e operacionais da plataforma.
                </p>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum log registrado recentemente.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold">
                      <th className="px-3 py-2 text-left">Ação</th>
                      <th className="px-3 py-2 text-left">Entidade</th>
                      <th className="px-3 py-2 text-left">IP</th>
                      <th className="px-3 py-2 text-left">Data / Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-bold text-slate-900">{log.action}</td>
                        <td className="px-3 py-2.5 text-slate-600">{log.entity}</td>
                        <td className="px-3 py-2.5 text-slate-400">{log.ipAddress || "localhost"}</td>
                        <td className="px-3 py-2.5 text-slate-500">{log.createdAt}</td>
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
