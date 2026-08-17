"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Sparkles, ArrowUpRight, CheckCircle2, Shield, Activity, DollarSign, TrendingUp, AlertTriangle } from "@/components/ui/icons";
import { queryAdminAICopilotAction } from "@/server/actions/admin-ai";
import type { AdminAIQueryResult } from "@/lib/ai/admin-copilot";

export function SuperAdminAICopilot() {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminAIQueryResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setErrorMsg(null);
    startTransition(async () => {
      const res = await queryAdminAICopilotAction(query);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setErrorMsg(res.error || "Erro ao consultar IA. Tente novamente.");
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-[var(--color-border)] relative overflow-hidden my-6">
      <div className="flex items-center justify-between gap-3 mb-2 relative z-10">
        <div className="flex items-center gap-2 text-[var(--color-primary)] font-extrabold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Copilot Executivo com Inteligência Artificial</span>
        </div>
        <span className="text-[10px] bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Super Admin
        </span>
      </div>

      <h2 className="text-base sm:text-lg font-black text-[var(--color-text-heading)] tracking-tight mb-3 relative z-10">
        Diagnósticos rápidos e perguntas sobre a operação SaaS:
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 relative z-10">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: 'Quais empresas possuem risco de churn?' ou 'Qual a taxa de inadimplência?'"
          className="flex-1 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-xs sm:text-sm text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-medium transition-all"
        />
        <button
          type="submit"
          disabled={isPending || !query.trim()}
          className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-[var(--shadow-primary)] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
        >
          {isPending ? (
            <span>Consultando IA...</span>
          ) : (
            <>
              <span>Consultar Copilot</span>
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

      {/* Resposta do Copilot */}
      {result && (
        <div className="mt-5 p-5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] space-y-4 animate-in fade-in relative z-10">
          <div className="flex items-center justify-between text-xs font-extrabold text-emerald-700 border-b border-[var(--color-border)] pb-3">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Diagnóstico executivo processado
            </span>
            <span className="text-[var(--color-text-subtle)] font-mono text-[11px]">{result.query}</span>
          </div>

          <p className="text-xs sm:text-sm text-[var(--color-text)] font-medium leading-relaxed">
            {result.summary}
          </p>

          {result.metrics && result.metrics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {result.metrics.map((m, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded-xl border border-[var(--color-border)] space-y-1 shadow-2xs">
                  <span className="text-[10px] text-[var(--color-text-subtle)] font-bold uppercase tracking-wider block">
                    {m.label}
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <strong className="text-base font-black text-[var(--color-text-heading)]">{m.value}</strong>
                    {m.badge && (
                      <span className="text-[10px] font-black bg-[var(--color-primary-light)] text-[var(--color-primary)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20">
                        {m.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.recommendedAction && (
            <div className="flex justify-end pt-2">
              <Link
                href={result.recommendedAction.href}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-black text-xs rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <span>{result.recommendedAction.label}</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
