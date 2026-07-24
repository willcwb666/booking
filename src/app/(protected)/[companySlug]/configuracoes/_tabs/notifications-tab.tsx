"use client";

import React from "react";
import { Mail, MessageSquare, Phone, Smartphone } from "@/components/ui/icons";

type Props = {
  canEdit: boolean;
  formState: {
    notifyEmailEnabled: boolean;
    notifyTextEnabled: boolean;
    notifySmsEnabled: boolean;
    notifyWhatsappEnabled: boolean;
  };
  onChange: (field: string, value: boolean) => void;
};

export function NotificationsTab({ canEdit, formState, onChange }: Props) {
  return (
    <div className="space-y-6 text-left">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Canais de Notificação & Alertas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure quais canais serão utilizados para enviar lembretes e confirmações aos seus clientes.
          </p>
        </div>

        {/* E-mail Notification Toggle */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-slate-900">Lembretes e Confirmações por E-mail</span>
            </div>
            <span className="text-[11px] text-slate-500 block pl-6">
              Envia e-mails automáticos de confirmação de agendamento, lembrete 24h e nota fiscal ao cliente.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formState.notifyEmailEnabled}
              onChange={(e) => onChange("notifyEmailEnabled", e.target.checked)}
              disabled={!canEdit}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#635bff]" />
          </label>
        </div>

        {/* Text Messages Main Toggle */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900">Mensagens de Texto (SMS & WhatsApp)</span>
              </div>
              <span className="text-[11px] text-slate-500 block pl-6">
                Habilita envio de mensagens instantâneas para celulares e WhatsApp dos clientes.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formState.notifyTextEnabled}
                onChange={(e) => onChange("notifyTextEnabled", e.target.checked)}
                disabled={!canEdit}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#635bff]" />
            </label>
          </div>

          {/* Sub-checkboxes de Canais (SMS e WhatsApp) */}
          {formState.notifyTextEnabled && (
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3 animate-fadeIn">
              <span className="text-xs font-bold text-slate-800 block">Canais de Mensagens de Texto Selecionados:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors shadow-2xs">
                  <input
                    type="checkbox"
                    checked={formState.notifyWhatsappEnabled}
                    onChange={(e) => onChange("notifyWhatsappEnabled", e.target.checked)}
                    disabled={!canEdit}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">WhatsApp</span>
                      <span className="text-[11px] text-slate-400 block">API local / Meta Cloud API</span>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors shadow-2xs">
                  <input
                    type="checkbox"
                    checked={formState.notifySmsEnabled}
                    onChange={(e) => onChange("notifySmsEnabled", e.target.checked)}
                    disabled={!canEdit}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Mensagem de Texto (SMS)</span>
                      <span className="text-[11px] text-slate-400 block">Envio via operadora móvel</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
