"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getSystemNotificationsAction,
  markNotificationReadAction,
  executeResetFromNotificationAction,
  type NotificationItem,
} from "@/server/actions/notifications-system";
import { toast } from "@/lib/toast-service";
import { Bell, RotateCcw, CheckCircle2, MessageSquare } from "@/components/ui/icons";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [receivedList, setReceivedList] = useState<NotificationItem[]>([]);
  const [sentList, setSentList] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  async function fetchNotifications() {
    const res = await getSystemNotificationsAction();
    if (res.success) {
      setReceivedList(res.received || []);
      setSentList(res.sent || []);
      setUnreadCount(res.unreadCount || 0);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  function handleToggle() {
    setIsOpen((prev) => !prev);
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationReadAction(id);
      fetchNotifications();
    });
  }

  function handleExecuteReset(id: string) {
    startTransition(async () => {
      const res = await executeResetFromNotificationAction(id);
      if (res.success) {
        toast.success("Executado!", res.message || "Reset de presets efetuado com sucesso.");
        fetchNotifications();
      } else {
        toast.error("Erro", res.error || "Falha ao executar reset.");
      }
    });
  }

  const currentList = activeTab === "received" ? receivedList : sentList;

  return (
    <div className="relative inline-block text-left">
      {/* Botão de Sino */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-200"
        title="Notificações do Sistema"
        aria-label="Notificações do Sistema"
      >
        <Bell className="w-5 h-5 text-slate-700" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white shadow-xs animate-pulse border border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover de Notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white border border-slate-200/90 shadow-2xl z-50 overflow-hidden text-left animate-fadeIn">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900">Notificações do Sistema</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Abas: Recebidas vs Enviadas */}
          <div className="p-2 bg-slate-100/60 border-b border-slate-200/60 flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("received")}
              className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "received"
                  ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📬 Recebidas</span>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sent")}
              className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "sent"
                  ? "bg-white text-indigo-600 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📤 Enviadas</span>
              <span className="text-[10px] text-slate-400">({sentList.length})</span>
            </button>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {currentList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhuma notificação {activeTab === "received" ? "recebida" : "enviada"} até o momento.
              </div>
            ) : (
              currentList.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 text-xs space-y-2 transition-colors ${
                    !notif.isRead && activeTab === "received" ? "bg-amber-50/40" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-extrabold text-slate-900">{notif.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">{notif.createdAt}</span>
                  </div>

                  <p className="text-slate-600 leading-relaxed text-[11px]">{notif.message}</p>

                  {notif.payload?.observation && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-700 font-mono flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{notif.payload.observation}</span>
                    </div>
                  )}

                  {/* Ação Executável de Reset para Super Admin */}
                  {notif.type === "PRESET_RESET_REQUEST" && activeTab === "received" && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      {notif.isResolved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Executado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleExecuteReset(notif.id)}
                          disabled={isPending}
                          className="px-3.5 py-1.5 bg-[#635bff] hover:bg-[#544dc9] text-white font-bold text-[11px] rounded-lg shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isPending ? "Executando..." : "⚡ Executar Reset Agora"}</span>
                        </button>
                      )}

                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notif.id)}
                          className="text-[10px] text-slate-400 hover:text-slate-700 underline font-medium"
                        >
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
