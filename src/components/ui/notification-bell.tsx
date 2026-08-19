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
        className="relative p-2 rounded-[var(--radius-control)] text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] hover:bg-[var(--color-bg-muted)] transition-all cursor-pointer border border-transparent hover:border-[var(--color-border)]"
        title="Notificações do Sistema"
        aria-label="Notificações do Sistema"
      >
        <Bell className="w-5 h-5 text-[var(--color-text)]" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--color-danger)] text-[var(--text-2xs)] font-semibold text-white shadow-xs animate-pulse border border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover de Notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[var(--radius-panel)] bg-[var(--color-bg)] border border-[var(--color-border)] shadow-2xl z-50 overflow-hidden text-left animate-fadeIn">
          {/* Header */}
          <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[var(--color-primary)]" />
              <h3 className="text-xs font-bold text-[var(--color-text-heading)]">Notificações do Sistema</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)] text-xs font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Abas: Recebidas vs Enviadas */}
          <div className="p-2 bg-[var(--color-bg-muted)] border-b border-[var(--color-border)] flex gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("received")}
              className={`flex-1 py-1.5 px-3 rounded-[var(--radius-control)] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "received"
                  ? "bg-[var(--color-bg)] text-[var(--color-primary)] shadow-2xs border border-[var(--color-border)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
              }`}
            >
              <span>📬 Recebidas</span>
              {unreadCount > 0 && (
                <span className="bg-[var(--color-danger)] text-white text-[var(--text-2xs)] px-1.5 py-0.2 rounded-full font-semibold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sent")}
              className={`flex-1 py-1.5 px-3 rounded-[var(--radius-control)] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "sent"
                  ? "bg-[var(--color-bg)] text-[var(--color-primary)] shadow-2xs border border-[var(--color-border)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
              }`}
            >
              <span>📤 Enviadas</span>
              <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)]">({sentList.length})</span>
            </button>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--color-border)]">
            {currentList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-subtle)]">
                Nenhuma notificação {activeTab === "received" ? "recebida" : "enviada"} até o momento.
              </div>
            ) : (
              currentList.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 text-xs space-y-2 transition-colors ${
                    !notif.isRead && activeTab === "received" ? "bg-[var(--color-warning-light)]" : "bg-[var(--color-bg)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-[var(--color-text-heading)]">{notif.title}</span>
                    <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] shrink-0">{notif.createdAt}</span>
                  </div>

                  <p className="text-[var(--color-text-muted)] leading-relaxed text-[var(--text-2xs)]">{notif.message}</p>

                  {notif.payload?.observation && (
                    <div className="p-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-[var(--text-2xs)] text-[var(--color-text)] font-mono flex items-start gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0 mt-0.5" />
                      <span>{notif.payload.observation}</span>
                    </div>
                  )}

                  {/* Ação Executável de Reset para Super Admin */}
                  {notif.type === "PRESET_RESET_REQUEST" && activeTab === "received" && (
                    <div className="pt-2 flex items-center justify-between border-t border-[var(--color-border)]">
                      {notif.isResolved ? (
                        <span className="inline-flex items-center gap-1 text-[var(--text-2xs)] font-bold text-[var(--color-success)] bg-[var(--color-success-light)] px-2.5 py-1 rounded-full border border-[var(--color-success-border)]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
                          Executado
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleExecuteReset(notif.id)}
                          disabled={isPending}
                          className="px-3.5 py-1.5 bg-[#635bff] hover:bg-[#544dc9] text-white font-bold text-[var(--text-2xs)] rounded-[var(--radius-control)] shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isPending ? "Executando..." : "⚡ Executar Reset Agora"}</span>
                        </button>
                      )}

                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notif.id)}
                          className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] underline font-medium"
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
