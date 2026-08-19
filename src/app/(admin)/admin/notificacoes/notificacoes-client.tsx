"use client";

import { useState, useTransition } from "react";
import {
  executeResetFromNotificationAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
  getSystemNotificationsAction,
  type NotificationItem,
} from "@/server/actions/notifications-system";
import { toast } from "@/lib/toast-service";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Bell, RotateCcw, CheckCircle2, MessageSquare, Building2, Clock } from "@/components/ui/icons";

type Props = {
  initialNotifications: NotificationItem[];
};

export function AdminNotificacoesClient({ initialNotifications }: Props) {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [receivedList, setReceivedList] = useState<NotificationItem[]>(
    initialNotifications.filter((n) => n.direction === "RECEIVED" || n.type === "PRESET_RESET_REQUEST")
  );
  const [sentList, setSentList] = useState<NotificationItem[]>(
    initialNotifications.filter((n) => n.direction === "SENT" && n.type !== "PRESET_RESET_REQUEST")
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

  function handleToggleReadStatus(notif: NotificationItem) {
    startTransition(async () => {
      if (notif.isRead) {
        await markNotificationUnreadAction(notif.id);
        toast.success("Status Alterado", "Notificação marcada como não lida.");
      } else {
        await markNotificationReadAction(notif.id);
        toast.success("Sucesso", "Notificação marcada como lida.");
      }
      refreshNotifications();
    });
  }

  const targetList = activeTab === "received" ? receivedList : sentList;

  const filteredNotifications = targetList.filter((n) => {
    if (filter === "pending") return !n.isResolved && !n.isRead;
    if (filter === "resolved") return n.isResolved || n.isRead;
    return true;
  });

  const pendingCount = receivedList.filter((n) => !n.isRead || !n.isResolved).length;

  return (
    <div className="page-content space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
            <Bell className="w-4 h-4" />
            <span>Notificações & Central de Pedidos</span>
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text-heading)] tracking-tight mt-1">
            Solicitações do Sistema e Alertas
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Gerencie os pedidos enviados pelas empresas da plataforma e veja as notificações disparadas.
          </p>
        </div>

        {pendingCount > 0 && (
          <span className="px-3.5 py-1.5 bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-full text-xs font-bold text-[var(--color-warning)] animate-pulse">
            {pendingCount} notificação(ões) não lida(s)
          </span>
        )}
      </div>

      {/* Abas Superiores: Recebidas vs Enviadas */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)]/80 pb-4">
        <div className="bg-[var(--color-bg-muted)]/80 p-1.5 rounded-[var(--radius-control)] border border-[var(--color-border)]/60 inline-flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("received")}
            className={`px-4 py-2 text-xs font-bold rounded-[var(--radius-control)] transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "received"
                ? "bg-[var(--color-bg)] text-[var(--color-primary)] shadow-2xs border border-[var(--color-border)]/80"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
            }`}
          >
            <span>Notificações Recebidas</span>
            {pendingCount > 0 && (
              <span className="bg-[var(--color-danger)] text-white text-[var(--text-2xs)] font-semibold px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sent")}
            className={`px-4 py-2 text-xs font-bold rounded-[var(--radius-control)] transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "sent"
                ? "bg-[var(--color-bg)] text-[var(--color-primary)] shadow-2xs border border-[var(--color-border)]/80"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
            }`}
          >
            <span>Notificações Enviadas</span>
            <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] font-semibold">({sentList.length})</span>
          </button>
        </div>

        {/* Sub-filtros: Todas / Não Lidas / Concluídas */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-control)] ${
              filter === "all" ? "bg-[var(--color-bg-muted)] text-[var(--color-text-heading)] font-bold" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
            }`}
          >
            Todas ({targetList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-control)] ${
              filter === "pending" ? "bg-[var(--color-bg-muted)] text-[var(--color-text-heading)] font-bold" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
            }`}
          >
            Não Lidas ({targetList.filter((n) => !n.isRead).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("resolved")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-control)] ${
              filter === "resolved" ? "bg-[var(--color-bg-muted)] text-[var(--color-text-heading)] font-bold" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
            }`}
          >
            Lidas / Concluídas ({targetList.filter((n) => n.isRead || n.isResolved).length})
          </button>
        </div>
      </div>

      {/* Lista de Notificações */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)]/80 shadow-2xs text-xs text-[var(--color-text-subtle)]">
            Nenhuma notificação {activeTab === "received" ? "recebida" : "enviada"} encontrada neste filtro.
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-6 rounded-[var(--radius-panel)] border transition-all space-y-4 shadow-2xs ${
                !notif.isRead && activeTab === "received"
                  ? "bg-[var(--color-primary-light)]/40 border-[var(--color-primary)]/30 shadow-xs"
                  : "bg-[var(--color-bg)] border-[var(--color-border)]/80"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]/30/60 font-bold">
                    <Bell className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">{notif.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mt-0.5">
                      {notif.payload?.companyName && (
                        <span className="flex items-center gap-1 font-semibold text-[var(--color-text)]">
                          <Building2 className="w-3.5 h-3.5 text-[var(--color-text-subtle)]" />
                          {notif.payload.companyName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[var(--color-text-subtle)]" />
                        {notif.createdAt}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {notif.isRead ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-muted)] px-3 py-1 rounded-full border border-[var(--color-border)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-text-subtle)]" />
                      Lida
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary-light)] px-3 py-1 rounded-full border border-[var(--color-primary)]/30">
                      ● Não lida
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed pl-13">{notif.message}</p>

              {notif.payload?.observation && (
                <div className="ml-13 p-3.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)]/80 rounded-[var(--radius-card)] text-xs text-[var(--color-text)] font-mono flex items-start gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[var(--color-text-heading)] font-sans block mb-0.5">Observação do Cliente:</strong>
                    <span>{notif.payload.observation}</span>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="ml-13 pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)]">
                {notif.type === "PRESET_RESET_REQUEST" && !notif.isResolved && (
                  <button
                    type="button"
                    onClick={() => handleExecuteReset(notif.id)}
                    disabled={isPending}
                    className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs rounded-[var(--radius-control)] shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{isPending ? "Executando Reset..." : "Executar Reset de Presets Agora"}</span>
                  </button>
                )}

                {activeTab === "received" && (
                  <ActionTooltip label={notif.isRead ? "Marcar como não lida" : "Marcar como Lida"}>
                    <button
                      type="button"
                      onClick={() => handleToggleReadStatus(notif)}
                      disabled={isPending}
                      className={`p-2 rounded-[var(--radius-control)] transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs ${
                        notif.isRead
                          ? "bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
                          : "bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </ActionTooltip>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
