"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  RotateCcw,
} from "@/components/ui/icons";
import { AlertCircle } from "lucide-react";
import { performSmartCheckinAction, type CheckinBookingData, type CheckinStatusResult } from "@/server/actions/checkin";

type Props = {
  booking: CheckinBookingData;
  token?: string;
  expTimestamp?: number;
};

export function CheckinClient({ booking, token, expTimestamp }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckinStatusResult | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "getting_location" | "ready" | "error">("idle");
  const [simulateProximity, setSimulateProximity] = useState(true); // Facilita testes imediatos

  const scheduledDate = new Date(booking.scheduledTime);
  const formattedTime = scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const formattedDate = scheduledDate.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

  const handleConfirmArrival = () => {
    setGpsStatus("getting_location");

    // Se estiver em modo de teste/simulação ou se o navegador não tiver GPS
    if (simulateProximity || typeof window === "undefined" || !navigator.geolocation) {
      setTimeout(() => {
        setGpsStatus("ready");
        startTransition(async () => {
          // Coordenada simulada a 30m do local
          const mockCoords = {
            latitude: (booking.companyLat || -25.4284) + 0.0002,
            longitude: (booking.companyLon || -49.2733) + 0.0002,
          };
          const res = await performSmartCheckinAction(booking.id, mockCoords, token, expTimestamp);
          setResult(res);
        });
      }, 600);
      return;
    }

    // Leitura real do GPS do celular
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsStatus("ready");
        startTransition(async () => {
          const clientCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          const res = await performSmartCheckinAction(booking.id, clientCoords, token, expTimestamp);
          setResult(res);
        });
      },
      (error) => {
        setGpsStatus("error");
        // Em caso de bloqueio de GPS, tenta validação pelo horário
        startTransition(async () => {
          const res = await performSmartCheckinAction(booking.id, undefined, token, expTimestamp);
          setResult(res);
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-muted)] flex items-center justify-center p-4 font-sans text-left antialiased">
      <div className="w-full max-w-md bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-xl overflow-hidden card-tactile">
        {/* Header com Status do Estabelecimento */}
        <div className="bg-[var(--color-navy)] text-white p-6 relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-[var(--text-2xs)] font-mono font-bold tracking-widest text-[var(--color-text-subtle)] uppercase bg-[var(--color-bg)] px-2.5 py-0.5 rounded-full border border-white/10">
              Check-in Inteligente
            </span>
            <span className="text-[var(--text-2xs)] font-bold text-[var(--color-success)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-ping"></span>
              <span>Recepção Aberta</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{booking.companyName}</h1>
          <p className="text-xs text-[var(--color-text-subtle)] flex items-center gap-1.5 mt-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-[var(--color-text-subtle)] shrink-0" />
            <span className="truncate">{booking.companyAddress || "Recepção Principal"}</span>
          </p>
        </div>

        {/* Resumo do Agendamento */}
        <div className="p-6 space-y-6">
          <div className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">Seu Horário</span>
              <span className="text-xs font-semibold text-[var(--color-text-heading)] bg-[var(--color-bg)] px-2.5 py-0.5 rounded-[var(--radius-control)] border border-[var(--color-border)] shadow-2xs font-mono">
                {booking.code}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
                <div>
                  <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] block font-bold">Data & Hora:</span>
                  <strong className="text-[var(--color-text-heading)] font-semibold">{formattedDate} às {formattedTime}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                <div>
                  <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] block font-bold">Profissional:</span>
                  <strong className="text-[var(--color-text-heading)] font-semibold">{booking.professionalName}</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--color-border)] flex items-center gap-2 text-xs">
              <Scissors className="w-4 h-4 text-[var(--color-text-muted)]" />
              <div>
                <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] block font-bold">Serviço:</span>
                <span className="text-[var(--color-text)] font-bold">{booking.serviceName}</span>
              </div>
            </div>
          </div>

          {/* Resultado do Check-in */}
          {result && (
            <div
              className={`p-5 rounded-[var(--radius-card)] border space-y-2 animate-in fade-in zoom-in-95 ${
                result.success
                  ? "bg-[var(--color-success-light)] border-[var(--color-success-border)] text-[var(--color-success)]"
                  : "bg-[var(--color-warning-light)] border-[var(--color-warning-border)] text-[var(--color-warning)]"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                {result.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0" />
                    <span>Check-in Confirmado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-[var(--color-warning)] shrink-0" />
                    <span>Atenção para o Check-in</span>
                  </>
                )}
              </div>

              <p className="text-xs font-medium leading-relaxed">
                {result.success ? result.message : result.error}
              </p>

              {result.distanceFormatted && (
                <div className="pt-2 border-t border-current/10 flex items-center justify-between text-[var(--text-2xs)] font-bold">
                  <span>📍 Proximidade verificada:</span>
                  <span className="font-mono bg-[var(--color-bg)] px-2 py-0.5 rounded border border-current/10">
                    {result.distanceFormatted} do local
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Ação Principal: Botão de Check-in */}
          {!result?.success && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleConfirmArrival}
                disabled={isPending || gpsStatus === "getting_location"}
                className="btn-tactile w-full py-4 px-6 bg-[var(--color-success)] hover:bg-[var(--color-success)] active:scale-[0.98] text-white rounded-[var(--radius-card)] font-semibold text-base shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isPending || gpsStatus === "getting_location" ? (
                  <span>Verificando localização e horário...</span>
                ) : (
                  <>
                    <MapPin className="w-5 h-5 animate-bounce" />
                    <span>Confirmar Minha Chegada</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[var(--text-2xs)] text-[var(--color-text-muted)] px-1 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-text-subtle)]" />
                  Validação segura por GPS
                </span>
                <span>Raio: até {booking.radiusMeters}m</span>
              </div>
            </div>
          )}

          {/* Feedback de Sucesso Final */}
          {result?.success && (
            <div className="space-y-3 text-center">
              <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-medium">
                🛋️ Você já está na fila! Sinta-se à vontade na sala de espera. O profissional será notificado para te chamar.
              </div>

              <Link
                href={`/${booking.companySlug}`}
                className="btn-tactile inline-flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] py-2"
              >
                <span>Ver página da empresa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Toggle de Simulação para Teste Imediato */}
          <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-[var(--text-2xs)] text-[var(--color-text-subtle)]">
            <span className="font-mono">Modo de Teste (Mock GPS):</span>
            <button
              type="button"
              onClick={() => setSimulateProximity((v) => !v)}
              className={`px-2.5 py-0.5 rounded-full font-bold text-[var(--text-2xs)] border transition-colors ${
                simulateProximity
                  ? "bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success-border)] font-semibold"
                  : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]"
              }`}
            >
              {simulateProximity ? "Simular Proximidade (35m) Ativo" : "Usar GPS Real do Celular"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
