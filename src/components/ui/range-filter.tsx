"use client";

import React, { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  GRANULARITY_LABELS,
  RANGE_PRESETS,
  rangeQuery,
  todayISO,
  type AnalyticsRange,
  type Granularity,
} from "@/lib/analytics-range";
import { Calendar } from "@/components/ui/icons";

type Props = {
  range: AnalyticsRange;
  /** Oculta o seletor de granularidade quando o painel não se beneficia dele. */
  showGranularity?: boolean;
};

/**
 * Filtro de período compartilhado pelos painéis.
 *
 * Escreve o recorte na URL, então o estado é compartilhável e o servidor
 * consegue agregar direto. O botão de período é acionado dezenas de vezes por
 * sessão: nada aqui anima, e a troca usa `startTransition` para o painel
 * anterior continuar legível enquanto o novo carrega, em vez de piscar vazio.
 */
export function RangeFilter({ range, showGranularity = true }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(range.key === "custom");
  const [draftFrom, setDraftFrom] = useState(range.from);
  const [draftTo, setDraftTo] = useState(range.to);

  function go(query: string) {
    startTransition(() => router.push(`${pathname}${query}`, { scroll: false }));
  }

  const today = todayISO();

  return (
    <div className="toolbar" data-pending={isPending || undefined}>
      <div className="scroller">
        <div className="segmented w-max" role="tablist" aria-label="Período">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              role="tab"
              aria-selected={range.key === preset.key}
              data-active={range.key === preset.key}
              onClick={() => {
                setCustomOpen(false);
                go(rangeQuery(range, { key: preset.key }));
              }}
              className="segmented-item whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={range.key === "custom"}
            data-active={range.key === "custom"}
            onClick={() => setCustomOpen((v) => !v)}
            className="segmented-item whitespace-nowrap inline-flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{range.key === "custom" ? range.label : "Escolher"}</span>
          </button>
        </div>
      </div>

      {customOpen && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={draftFrom}
            max={draftTo || today}
            onChange={(e) => setDraftFrom(e.target.value)}
            aria-label="Data inicial"
            className="input"
            style={{ paddingBlock: "0.35rem", fontSize: "var(--text-xs)", width: "auto" }}
          />
          <span className="text-[var(--color-text-subtle)]">–</span>
          <input
            type="date"
            value={draftTo}
            min={draftFrom}
            max={today}
            onChange={(e) => setDraftTo(e.target.value)}
            aria-label="Data final"
            className="input"
            style={{ paddingBlock: "0.35rem", fontSize: "var(--text-xs)", width: "auto" }}
          />
          <button
            type="button"
            disabled={!draftFrom || !draftTo}
            onClick={() =>
              go(rangeQuery(range, { key: "custom", from: draftFrom, to: draftTo }))
            }
            className="btn btn-secondary btn-sm"
          >
            Aplicar
          </button>
        </div>
      )}

      <span className="toolbar-spacer" />

      {showGranularity && (
        <label className="flex items-center gap-2">
          <span className="eyebrow">Agrupar por</span>
          <select
            value={range.granularity}
            onChange={(e) =>
              go(rangeQuery(range, { granularity: e.target.value as Granularity }))
            }
            aria-label="Granularidade"
            className="input"
            style={{ paddingBlock: "0.35rem", fontSize: "var(--text-xs)", width: "auto" }}
          >
            {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((g) => (
              <option key={g} value={g}>
                {GRANULARITY_LABELS[g]}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
