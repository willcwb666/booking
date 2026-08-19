"use client";

import React from "react";
import Link from "next/link";
import { RotateCcw, Calendar, Clock, ArrowRight, Sparkles } from "@/components/ui/icons";
import { calculateNextReturnDate } from "@/lib/agenda/return-anchor";

type Props = {
  serviceName: string;
  professionalName?: string;
  companySlug: string;
  currentDate?: Date;
  habitualTime?: string;
};

export function ReturnAnchorCard({
  serviceName,
  professionalName = "seu especialista",
  companySlug,
  currentDate = new Date(),
  habitualTime = "14:00",
}: Props) {
  const suggestion = calculateNextReturnDate(serviceName, currentDate, habitualTime);

  return (
    <div className="bg-white border border-[var(--color-border)]/90 rounded-3xl p-6 space-y-4 shadow-xs card-tactile text-left">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[var(--color-primary)]" />
          <h3 className="text-sm font-black text-[var(--color-text-heading)]">Garanta seu Próximo Atendimento</h3>
        </div>
        <span className="text-[10px] font-bold text-[var(--color-success)] bg-[var(--color-success-light)] border border-[var(--color-success-border)] px-2.5 py-0.5 rounded-full">
          10% OFF na Volta
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-[var(--color-text-muted)] font-medium">
          Mantenha sua rotina em dia. Reservamos uma sugestão no seu horário habitual com {professionalName}:
        </p>

        <div className="p-3 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
            <strong className="text-[var(--color-text-heading)] capitalize">{suggestion.suggestedDateFormatted}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] font-bold font-mono">
            <Clock className="w-3.5 h-3.5 text-[var(--color-text-subtle)]" />
            <span>{suggestion.suggestedTime}</span>
          </div>
        </div>
      </div>

      <Link
        href={`/book/${companySlug}?date=${suggestion.suggestedDate}&time=${suggestion.suggestedTime}&returnAnchor=true`}
        className="btn-tactile w-full py-3 px-4 bg-[var(--color-navy)] hover:bg-[var(--color-navy)] text-white rounded-2xl font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
      >
        <span>Garantir Meu Horário Próximo Mês</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
