"use client";

import React from "react";
import { NotificationBell } from "@/components/ui/notification-bell";

export function AdminHeader() {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-xs px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 text-left">
      <div>
        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
          Painel de Controle
        </span>
        <h2 className="text-sm font-extrabold text-slate-900">Plataforma Super Admin</h2>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  );
}
