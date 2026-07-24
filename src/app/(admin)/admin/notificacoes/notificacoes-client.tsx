"use client";

import React, { useState, useTransition } from "react";
import {
  executeResetFromNotificationAction,
  markNotificationReadAction,
  getSystemNotificationsAction,
  type NotificationItem,
} from "@/server/actions/notifications-system";
import { toast } from "@/lib/toast-service";
import { Bell, RotateCcw, CheckCircle2, MessageSquare, Building2, Clock } from "@/components/ui/icons";

type Props = {
  initialNotifications: NotificationItem[];
};

export function AdminNotificacoesClient({ initialNotifications }: Props) {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [receivedList, setReceivedList] = useState<NotificationItem[]>(
    initialNotifications.filter((n) => n.type === "PRESET_RESET_REQUEST")
  );
  const [sentList, setSentList] = useState<NotificationItem[]>(
    initialNotifications.filter((n) => n.type !== "PRESET_RESET_REQUEST")
  );
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const [isPending, startTransition] = useTransition();

  async function refreshNotifications() {
    const res = await getSystemNotificationsAction();
    if (res.success) {
      setNotifications(res.notifications);
      setReceivedList(res.received);
      setSentList(res.sent);
    }
  }

  function handleExecuteReset(notificationId: string) {
    startTransition(async () => {
      const res = await executeResetFromNotificationAction(notificationId);
      if (res.success) {
        toast.success("Executado!", res.message || "Reset de presets concluído com sucesso.");
        refreshNotifications();
      } else {
        toast.error("Erro", res.error || "Falha ao executar o reset de presets.");
      }
    });
  }

  function handleMarkAsRead(notificationId: string) {
    startTransition(async () => {
      await markNotificationReadAction(notificationId);
      refreshNotifications();
    });
  }

  const targetList = activeTab === "received" ? receivedList : sentList;

  const filteredNotifications = targetList.filter((n) => {
    if (filter === "pending") return !n.isResolved;
    if (filter === "resolved") return n.isResolved;
    return true;
  });

  const pendingCount = receivedList.filter((n) => !n.isResolved).length;

  return (
    <div className="w-full max-w-7xl text-left space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
            <Bell className="w-4 h-4" />
            <span>Notificações & Central de Pedidos</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            Solicitações do Sistema e Alertas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie os pedidos enviados pelas empresas da plataforma e veja as notificações disparadas.
          </p>
        </div>

        {pendingCount > 0 && (
          <span className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-800 animate-pulse">
            ⚠️ {pendingCount} solicitação(ões) pendente(s)
          </span>
        )}
      </div>

      {/* Abas Superiores: Recebidas vs Enviadas */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div className="bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60 inline-flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("received")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "received"
                ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📬 Notificações Recebidas</span>
            {pendingCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "sent"
                ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📤 Notificações Enviadas</span>
            <span className="text-[10px] text-slate-400 font-semibold">({sentList.length})</span>
          </button>
        </div>

        {/* Sub-filtros: Todas / Pendentes / Concluídas */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
              filter === "all" ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Todas ({targetList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
              filter === "pending" ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Pendentes ({targetList.filter((n) => !n.isResolved).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("resolved")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
              filter === "resolved" ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Concluídas ({targetList.filter((n) => n.isResolved).length})
          </button>
        </div>
      </div>

      {/* Lista de Notificações */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs text-xs text-slate-400">
            Nenhuma notificação {activeTab === "received" ? "recebida" : "enviada"} encontrada neste filtro.
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-6 rounded-3xl border transition-all space-y-4 shadow-2xs ${
                !notif.isRead && activeTab === "received"
                  ? "bg-indigo-50/30 border-indigo-200/80"
                  : "bg-white border-slate-200/80"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200/60 font-bold">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">{notif.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      {notif.payload?.companyName && (
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {notif.payload.companyName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {notif.createdAt}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {notif.payload?.paidViaStripe && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      💳 Pago via Stripe
                    </span>
                  )}

                  {notif.isResolved ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Status: Concluído
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      Status: Pendente
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pl-13">{notif.message}</p>

              {notif.payload?.observation && (
                <div className="ml-13 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-700 font-mono flex items-start gap-2.5">
                  <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 font-sans block mb-0.5">Observação do Cliente:</strong>
                    <span>{notif.payload.observation}</span>
                  </div>
                </div>
              )}

              <div className="ml-13 pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                {notif.type === "PRESET_RESET_REQUEST" && !notif.isResolved && (
                  <button
                    type="button"
                    onClick={() => handleExecuteReset(notif.id)}
                    disabled={isPending}
                    className="px-5 py-2.5 bg-[#635bff] hover:bg-[#544dc9] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{isPending ? "Executando Reset..." : "⚡ Executar Reset de Presets Agora"}</span>
                  </button>
                )}

                {!notif.isRead && activeTab === "received" && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="text-xs text-slate-500 hover:text-slate-900 underline font-medium"
                  >
                    Marcar como lida
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
