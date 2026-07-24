"use client";

import React, { useEffect, useState } from "react";
import { getPlatformSettingsAction, type PlatformSettingsData } from "@/server/actions/admin-settings";
import { AlertTriangle, Clock } from "@/components/ui/icons";

export function MaintenanceBanner() {
  const [settings, setSettings] = useState<PlatformSettingsData | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getPlatformSettingsAction();
      if (res.success && res.settings.maintenanceEnabled) {
        setSettings(res.settings);
      }
    }
    load();
  }, []);

  if (!settings || !settings.maintenanceEnabled) return null;

  const isUnavailable = settings.maintenanceImpact === "UNAVAILABLE";

  return (
    <div
      className={`w-full px-6 py-3 text-xs font-bold flex flex-wrap items-center justify-between gap-4 border-b shadow-xs text-left animate-fadeIn ${
        isUnavailable
          ? "bg-red-600 text-white border-red-700"
          : "bg-amber-500 text-slate-950 border-amber-600"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-1 rounded-lg bg-black/10 shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <span className="font-extrabold uppercase tracking-wider block text-[10px] opacity-90">
            {isUnavailable ? "⚠️ Manutenção Programada (Sistema Indisponível)" : "⚠️ Aviso de Desempenho (Manutenção)"}
          </span>
          <p className="mt-0.5">{settings.maintenanceMessage}</p>
        </div>
      </div>

      {(settings.maintenanceStart || settings.maintenanceEnd) && (
        <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-xl shrink-0 text-[11px]">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {settings.maintenanceStart && `Início: ${new Date(settings.maintenanceStart).toLocaleString("pt-BR")}`}
            {settings.maintenanceStart && settings.maintenanceEnd && " · "}
            {settings.maintenanceEnd && `Previsão Término: ${new Date(settings.maintenanceEnd).toLocaleString("pt-BR")}`}
          </span>
        </div>
      )}
    </div>
  );
}
