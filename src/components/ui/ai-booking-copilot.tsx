"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Sparkles, ArrowUpRight, CheckCircle2, Clock, User, Scissors } from "@/components/ui/icons";
import { Mic, MicOff } from "lucide-react";
import { parseAIBookingIntentAction } from "@/server/actions/ai-copilot";
import type { ParsedBookingIntent } from "@/lib/ai/booking-copilot";

type Props = {
  companySlug: string;
  onApplyIntent?: (intent: ParsedBookingIntent) => void;
};

export function AIBookingCopilot({ companySlug, onApplyIntent }: Props) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ParsedBookingIntent | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);

  // Verifica suporte à Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setHasSpeechSupport(Boolean(SpeechRecognition));
    }
  }, []);

  const handleToggleVoice = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz direto. Digite seu pedido no campo de texto.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQuery(transcript);
          triggerAnalysis(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const triggerAnalysis = (textToAnalyze: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await parseAIBookingIntentAction(companySlug, textToAnalyze);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    triggerAnalysis(query);
  };

  const quickPrompts = [
    "Corte e barba amanhã às 16h",
    "Manicure no sábado de manhã",
    "Limpeza de pele na sexta-feira",
  ];

  return (
    <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] p-5 sm:p-7 text-[var(--color-text-heading)] shadow-xs border border-[var(--color-border)] relative overflow-hidden my-6 card-tactile">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
        <div className="flex items-center gap-2 text-[var(--color-text-heading)] font-semibold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-[var(--color-success)] animate-pulse" />
          <span>Secretária & Agendamento por IA</span>
        </div>
        <span className="text-[var(--text-2xs)] bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success-border)] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-ping"></span>
          <span>IA Ativa 2.0</span>
        </span>
      </div>

      <h3 className="text-base sm:text-lg font-semibold text-[var(--color-text-heading)] tracking-tight mb-2 relative z-10">
        Fale ou digite o que deseja e a IA encontra os melhores horários:
      </h3>

      {/* Form Input + Voice Button */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 relative z-10">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: 'Quero corte e barba no sábado de manhã com o Carlos'"
            className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-card)] pl-4 pr-12 py-3 text-xs sm:text-sm text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] font-medium transition-all"
          />

          {/* Voice Input Button */}
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isListening ? "Parar gravação" : "Falar por microfone"}
              className={`absolute right-2.5 p-2 rounded-[var(--radius-control)] border transition-all ${
                isListening
                  ? "bg-[var(--color-danger)] text-white border-[var(--color-danger-border)] animate-pulse"
                  : "bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-bg-muted)]"
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending || !query.trim()}
          className="btn-tactile px-6 py-3 bg-[var(--color-navy)] hover:bg-[var(--color-navy)] active:scale-[0.98] text-white font-semibold text-xs sm:text-sm rounded-[var(--radius-card)] shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
        >
          {isPending ? (
            <span>Processando com IA...</span>
          ) : (
            <>
              <span>Analisar Pedido</span>
              <ArrowUpRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Quick Prompts Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-3">
        <span className="text-[var(--text-2xs)] font-bold text-[var(--color-text-subtle)]">Sugestões:</span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setQuery(p);
              triggerAnalysis(p);
            }}
            className="text-[var(--text-2xs)] bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] font-semibold px-3 py-1 rounded-full border border-[var(--color-border)] transition-colors"
          >
            "{p}"
          </button>
        ))}
      </div>

      {errorMsg && (
        <p className="text-xs text-[var(--color-danger)] font-bold mt-3 bg-[var(--color-danger-light)] p-3 rounded-[var(--radius-card)] border border-[var(--color-danger-border)]">
          ⚠️ {errorMsg}
        </p>
      )}

      {/* Resultado Interpretado pela IA */}
      {result && (
        <div className="mt-4 p-4 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] space-y-3 animate-in fade-in relative z-10 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--color-success)] border-b border-[var(--color-border)] pb-2">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" /> IA identificou com {result.confidenceScore}% de confiança
            </span>
            <span className="text-[var(--text-2xs)] font-mono text-[var(--color-text-subtle)]">Google Gemini Flash Engine</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {result.matchedServiceName && (
              <div className="bg-[var(--color-bg)] p-3 rounded-[var(--radius-control)] border border-[var(--color-border)] flex items-center gap-2.5 shadow-2xs">
                <Scissors className="w-4 h-4 text-[var(--color-text)]" />
                <div>
                  <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] font-bold block">Serviço:</span>
                  <strong className="text-[var(--color-text-heading)] font-semibold">{result.matchedServiceName}</strong>
                </div>
              </div>
            )}

            {result.matchedProfessionalName && (
              <div className="bg-[var(--color-bg)] p-3 rounded-[var(--radius-control)] border border-[var(--color-border)] flex items-center gap-2.5 shadow-2xs">
                <User className="w-4 h-4 text-[var(--color-text)]" />
                <div>
                  <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] font-bold block">Especialista:</span>
                  <strong className="text-[var(--color-text-heading)] font-semibold">{result.matchedProfessionalName}</strong>
                </div>
              </div>
            )}

            <div className="bg-[var(--color-bg)] p-3 rounded-[var(--radius-control)] border border-[var(--color-border)] flex items-center gap-2.5 shadow-2xs">
              <Clock className="w-4 h-4 text-[var(--color-text)]" />
              <div>
                <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] font-bold block">Horário Sugerido:</span>
                <strong className="text-[var(--color-text-heading)] font-semibold">
                  {result.exactTime ? `Às ${result.exactTime}` : result.timePreference} {result.targetDateStr ? `(${result.targetDateStr})` : ""}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
