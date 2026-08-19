"use client";

import React from "react";
import Link from "next/link";
import { Zap, Clock, User, ArrowRight, Sparkles } from "@/components/ui/icons";
import type { GhostSlotOffer } from "@/lib/agenda/ghost-slot-buster";

type Props = {
  offers: GhostSlotOffer[];
  companySlug: string;
  configId?: string;
};

export function GhostSlotBanner({ offers, companySlug, configId }: Props) {
  if (!offers || offers.length === 0) return null;

  const topOffer = offers[0];

  const fmtCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const targetHref = configId
    ? `/book/${companySlug}/${configId}?slot=${topOffer.startTime}&pro=${topOffer.professionalId}&flash=true`
    : `/book/${companySlug}?slot=${topOffer.startTime}&pro=${topOffer.professionalId}&flash=true`;

  return (
    <div className="bg-gradient-to-r from-[var(--color-warning)]/10 via-[var(--color-warning)]/5 to-transparent border border-[var(--color-warning-border)] rounded-[var(--radius-panel)] p-5 sm:p-6 my-5 relative overflow-hidden shadow-2xs card-tactile animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[length:var(--text-xs)] font-semibold bg-[var(--color-warning)] text-white shadow-2xs">
              <Zap className="w-3.5 h-3.5 animate-bounce" />
              <span>DESISTÊNCIA RELÂMPAGO</span>
            </span>
            <span className="text-xs font-bold text-[var(--color-warning)] font-mono">
              Inicia em {topOffer.minutesUntilStart} min
            </span>
          </div>

          <h3 className="text-base font-semibold text-[var(--color-text-heading)]">
            Horário Vago com {topOffer.discountPercentage}% de Desconto Exclusivo!
          </h3>

          <p className="text-xs text-[var(--color-text-muted)] font-medium flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              Com {topOffer.professionalName}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              Hoje às {topOffer.startTime}
            </span>
          </p>
        </div>

        {/* Preço & CTA */}
        <div className="flex items-center gap-3 sm:self-center">
          <div className="text-right">
            <span className="text-[length:var(--text-2xs)] line-through text-[var(--color-text-subtle)] font-bold block">
              {fmtCurrency(topOffer.originalPrice)}
            </span>
            <span className="text-lg font-semibold text-[var(--color-warning)]">
              {fmtCurrency(topOffer.flashPrice)}
            </span>
          </div>

          <Link
            href={targetHref}
            className="btn-tactile px-4 py-2.5 bg-[var(--color-navy)] hover:bg-[var(--color-navy)] text-white rounded-[var(--radius-card)] text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 shrink-0"
          >
            <span>Garantir Vaga</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
