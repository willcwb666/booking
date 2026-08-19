"use client";

import React, { useState, useEffect, useTransition } from "react";
import { toast } from "@/lib/toast-service";
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  ExternalLink,
  Shield,
} from "@/components/ui/icons";
import {
  triggerGoogleCalendarSyncAction,
  updateIcalFeedAction,
  getCalendarIntegrationStatusAction,
} from "@/server/actions/calendar-sync";

type Props = {
  companySlug: string;
  canEdit: boolean;
  bookingBaseUrl: string;
};

export function CalendarTab({ companySlug, canEdit, bookingBaseUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLastSync, setGoogleLastSync] = useState<string | null>(null);

  const [icalUrl, setIcalUrl] = useState("");
  const [icalLastSync, setIcalLastSync] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // URL do feed iCal exportado (com token secreto) para o profissional assinar.
  // Vem do servidor via status; vazio até carregar (o feed exige token).
  const [exportIcalPath, setExportIcalPath] = useState<string | null>(null);
  const exportIcalUrl = exportIcalPath ? `${bookingBaseUrl || ""}${exportIcalPath}` : "";

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await getCalendarIntegrationStatusAction(companySlug);
        if (res.success && res.google) {
          setGoogleConnected(res.google.isConnected);
          setGoogleLastSync(res.google.lastSyncedAt);
          if (res.icalExportPath) setExportIcalPath(res.icalExportPath);
          if (res.ical) {
            setIcalUrl(res.ical.url || "");
            setIcalLastSync(res.ical.lastSyncedAt);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar status do calendário:", err);
      } finally {
        setLoadingStatus(false);
      }
    }
    loadStatus();
  }, [companySlug]);

  function handleSyncGoogle() {
    startTransition(async () => {
      const res = await triggerGoogleCalendarSyncAction(companySlug);
      if (res.success) {
        toast.success(`Google Calendar sincronizado! ${res.syncedCount} evento(s) atualizado(s).`);
        setGoogleLastSync(new Date().toISOString());
      } else {
        toast.error(res.error || "Falha na sincronização");
      }
    });
  }

  function handleSaveIcal() {
    startTransition(async () => {
      const res = await updateIcalFeedAction(companySlug, null, icalUrl);
      if (res.success) {
        toast.success("Feed iCal atualizado e sincronizado!");
        setIcalLastSync(new Date().toISOString());
      } else {
        toast.error(res.error || "Erro ao salvar feed");
      }
    });
  }

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  }

  return (
    <div className="space-y-6">
      {/* HEADER DA ABA */}
      <div className="bg-[var(--color-bg)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-xs">
        <div className="flex items-center gap-2 text-[var(--color-primary)] font-semibold text-xs uppercase tracking-wider mb-1">
          <Calendar className="w-4 h-4 text-[var(--color-primary)] animate-pulse" />
          <span>Sincronização Bidirecional</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary)] text-[var(--text-2xs)] font-semibold ml-2">
            2-WAY SYNC
          </span>
        </div>
        <h2 className="text-xl font-semibold text-[var(--color-text-heading)]">
          Calendários Externos (Google, Apple & Outlook)
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-2xl">
          Evite agendamentos conflitantes (*no double booking*). Quando você tiver uma consulta médica ou compromisso pessoal no seu calendário pessoal, o horário é bloqueado automaticamente no Booking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: GOOGLE CALENDAR */}
        <div className="bg-[var(--color-bg)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-warning-light)] text-[var(--color-warning)] flex items-center justify-center font-semibold text-sm border border-[var(--color-warning-border)]">
                  G
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Google Calendar</h3>
                  <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)]">Sincronização direta via OAuth2</p>
                </div>
              </div>

              <span
                className={`text-[var(--text-2xs)] font-semibold px-2.5 py-0.5 rounded-full border ${
                  googleConnected
                    ? "bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success-border)]"
                    : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                }`}
              >
                {googleConnected ? "CONECTADO" : "NÃO CONECTADO"}
              </span>
            </div>

            <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] text-xs text-[var(--color-text-muted)] space-y-2 border border-[var(--color-border)]">
              <div className="flex items-center gap-2 text-[var(--color-text-heading)] font-bold text-[var(--text-2xs)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
                <span>Novos agendamentos enviados para o Google Calendar</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--color-text-heading)] font-bold text-[var(--text-2xs)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
                <span>Compromissos pessoais bloqueiam horários na agenda pública</span>
              </div>
              {googleLastSync && (
                <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] pt-1 border-t border-[var(--color-border)]">
                  Última sincronização: {new Date(googleLastSync).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
            {googleConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleSyncGoogle}
                  disabled={isPending}
                  className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-[var(--radius-control)] transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
                  <span>{isPending ? "Sincronizando..." : "Sincronizar Agora"}</span>
                </button>

                <a
                  href="/api/auth/google-calendar"
                  className="text-xs font-bold text-[var(--color-text-subtle)] hover:text-[var(--color-text-heading)] hover:underline"
                >
                  Reconectar Conta
                </a>
              </>
            ) : (
              <a
                href="/api/auth/google-calendar"
                className="w-full text-center px-4 py-2.5 bg-[var(--color-info)] hover:bg-[var(--color-info)] text-white text-xs font-semibold rounded-[var(--radius-control)] transition-all shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Conectar com Google Calendar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* CARD 2: APPLE CALENDAR & OUTLOOK (ICAL FEED) */}
        <div className="bg-[var(--color-bg)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center font-semibold text-sm border border-[var(--color-primary)]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-heading)]">Apple Calendar & Outlook</h3>
                  <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)]">Importação via feed .ics ou webcal://</p>
                </div>
              </div>

              <span
                className={`text-[var(--text-2xs)] font-semibold px-2.5 py-0.5 rounded-full border ${
                  icalUrl
                    ? "bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success-border)]"
                    : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]"
                }`}
              >
                {icalUrl ? "ATIVO" : "INATIVO"}
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-[var(--text-2xs)] font-bold text-[var(--color-text-heading)]">
                URL do feed .ics do seu calendário pessoal:
              </label>
              <input
                type="url"
                value={icalUrl}
                onChange={(e) => setIcalUrl(e.target.value)}
                placeholder="https://p01-caldav.icloud.com/... ou webcal://..."
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
              />
              <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)]">
                Cole o link público/compartilhado do seu iCloud Calendar ou Microsoft Outlook para importar compromissos.
              </p>
              {icalLastSync && (
                <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)]">
                  Última sincronização: {new Date(icalLastSync).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--color-border)] flex justify-end">
            <button
              type="button"
              onClick={handleSaveIcal}
              disabled={isPending}
              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-semibold rounded-[var(--radius-control)] transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span>{isPending ? "Sincronizando..." : "Salvar & Sincronizar Feed"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* FEED DE EXPORTAÇÃO ICAL PARA O CELULAR DO PROFISSIONAL */}
      <div className="bg-[var(--color-bg)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-xs space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-heading)] flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--color-success)]" />
          <span>Assinar a Agenda do Booking no seu iPhone / Mac / Android</span>
        </h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Você também pode visualizar todos os agendamentos da empresa diretamente no aplicativo de calendário do seu celular via assinatura iCal:
        </p>

        <div className="flex items-center gap-2 max-w-xl">
          <input
            readOnly
            value={exportIcalUrl}
            className="flex-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-xs text-[var(--color-text-heading)] font-mono truncate select-all"
          />
          <button
            type="button"
            onClick={() => handleCopy(exportIcalUrl, "Link iCal")}
            className="px-3.5 py-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] text-xs font-semibold rounded-[var(--radius-control)] transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
