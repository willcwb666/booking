"use client";

import React, { useState, useTransition } from "react";
import { Sparkles, ArrowUpRight, CheckCircle2, Clock, User, Scissors } from "@/components/ui/icons";
import { parseAIBookingIntentAction } from "@/server/actions/ai-copilot";
import type { ParsedBookingIntent } from "@/lib/ai/booking-copilot";

type Props = {
  companySlug: string;
  onApplyIntent?: (intent: ParsedBookingIntent) => void;
};

export function AIBookingCopilot({ companySlug, onApplyIntent }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ParsedBookingIntent | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await parseAIBookingIntentAction(companySlug, query);
      if (res.success && res.data) {
        setResult(res.data);
        if (onApplyIntent) {
          onApplyIntent(res.data);
        }
      } else {
        setErrorMsg(res.error || "Não conseguimos entender seu pedido. Tente ser mais específico.");
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 text-[var(--color-text)] shadow-xs border border-[var(--color-border)] relative overflow-hidden my-6">
      <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
        <div className="flex items-center gap-2 text-[var(--color-primary)] font-extrabold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Agendamento Inteligente por IA</span>
        </div>
        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-2.5 py-0.5 rounded-full">
          Nativo 2.0
        </span>
      </div>

      <h3 className="text-base sm:text-lg font-black text-[var(--color-text-heading)] tracking-tight mb-2 relative z-10">
        Digite como prefere agendar e a IA encontra para você:
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 relative z-10">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: 'Quero corte e barba no sábado de manhã com o Renato'"
            className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !query.trim()}
          className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-[var(--shadow-primary)] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
        >
          {isPending ? (
            <span>Analisando com IA...</span>
          ) : (
            <>
              <span>Encontrar Horário</span>
              <ArrowUpRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {errorMsg && (
        <p className="text-xs text-red-700 font-bold mt-3 bg-red-50 p-3 rounded-2xl border border-red-200">
          ⚠️ {errorMsg}
        </p>
      )}

      {/* Resultado Interpretado pela IA */}
      {result && (
        <div className="mt-4 p-4 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] space-y-3 animate-in fade-in relative z-10">
          <div className="flex items-center justify-between text-xs font-extrabold text-emerald-700">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> IA identificou com sucesso ({result.confidenceScore}% de precisão)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {result.matchedServiceName && (
              <div className="bg-white p-2.5 rounded-xl border border-[var(--color-border)] flex items-center gap-2 shadow-2xs">
                <Scissors className="w-4 h-4 text-[var(--color-primary)]" />
                <div>
                  <span className="text-[10px] text-[var(--color-text-subtle)] block">Serviço:</span>
                  <strong className="text-[var(--color-text-heading)] font-bold">{result.matchedServiceName}</strong>
                </div>
              </div>
            )}

            {result.matchedProfessionalName && (
              <div className="bg-white p-2.5 rounded-xl border border-[var(--color-border)] flex items-center gap-2 shadow-2xs">
                <User className="w-4 h-4 text-[var(--color-primary)]" />
                <div>
                  <span className="text-[10px] text-[var(--color-text-subtle)] block">Profissional:</span>
                  <strong className="text-[var(--color-text-heading)] font-bold">{result.matchedProfessionalName}</strong>
                </div>
              </div>
            )}

            <div className="bg-white p-2.5 rounded-xl border border-[var(--color-border)] flex items-center gap-2 shadow-2xs">
              <Clock className="w-4 h-4 text-[var(--color-primary)]" />
              <div>
                <span className="text-[10px] text-[var(--color-text-subtle)] block">Período Ideal:</span>
                <strong className="text-[var(--color-text-heading)] font-bold">
                  {result.exactTime ? `Às ${result.exactTime}` : result.timePreference} ({result.targetDateStr})
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
