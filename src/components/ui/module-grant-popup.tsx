"use client";

import React, { useState, useEffect } from "react";
import { getSystemNotificationsAction, markNotificationReadAction, type NotificationItem } from "@/server/actions/notifications-system";
import { Sparkles, CheckCircle2 } from "@/components/ui/icons";

export function ModuleGrantPopup() {
  const [popupNotification, setPopupNotification] = useState<NotificationItem | null>(null);

  useEffect(() => {
    async function checkNotifications() {
      const res = await getSystemNotificationsAction();
      if (res.success) {
        const list = res.notifications || [];
        const grantNotif = list.find(
          (n) =>
            !n.isRead &&
            (n.title.toLowerCase().includes("boas notícias") ||
              n.title.toLowerCase().includes("módulo") ||
              n.title.toLowerCase().includes("liberado") ||
              n.title.toLowerCase().includes("ativado") ||
              n.message.toLowerCase().includes("módulo") ||
              n.message.toLowerCase().includes("liberado"))
        );
        if (grantNotif) {
          setPopupNotification(grantNotif);
        }
      }
    }

    checkNotifications();
    const interval = setInterval(checkNotifications, 4000); // Polling a cada 4s para pop-up instantâneo
    return () => clearInterval(interval);
  }, []);

  if (!popupNotification) return null;

  async function handleDismiss() {
    if (popupNotification) {
      await markNotificationReadAction(popupNotification.id);
      setPopupNotification(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-navy)] backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-2xl max-w-md w-full p-6 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-primary)] flex items-center justify-center mx-auto shadow-xs">
          <Sparkles className="w-8 h-8 text-[var(--color-primary)] animate-pulse" />
        </div>

        <div>
          <span className="text-[var(--text-2xs)] font-semibold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary-light)] px-3 py-1 rounded-full">
            🎉 Novidade no seu Painel
          </span>
          <h2 className="text-xl font-semibold text-[var(--color-text-heading)] mt-2">
            {popupNotification.title}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed font-medium">
            {popupNotification.message}
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs rounded-[var(--radius-control)] shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Aproveitar Agora 🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
}
