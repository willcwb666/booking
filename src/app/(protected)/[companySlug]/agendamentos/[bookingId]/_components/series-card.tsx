"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-service";
import { cancelRecurrenceSeriesAction } from "@/server/actions/recurrence";
import type { SeriesSummary } from "@/server/queries/bookings";
import { RotateCcw } from "@/components/ui/icons";

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "semanal",
  BIWEEKLY: "quinzenal",
  MONTHLY: "mensal",
};

/**
 * O cartão que faltava.
 *
 * A série de doze semanas era criada e depois cada ocorrência vivia sozinha:
 * nada na tela dizia que ela fazia parte de um conjunto, e cancelar as onze
 * restantes era abrir uma por uma. O cliente desistia do pacote e alguém no
 * balcão passava dez minutos clicando.
 */
export function SeriesCard({
  companySlug,
  bookingId,
  series,
}: {
  companySlug: string;
  bookingId: string;
  series: SeriesSummary;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const label = series.frequency ? FREQUENCY_LABELS[series.frequency] ?? "recorrente" : "recorrente";

  const cancelSeries = () => {
    startTransition(async () => {
      const res = await cancelRecurrenceSeriesAction(companySlug, bookingId);
      if (!res.success) {
        toast.error("Não cancelado", res.error);
        return;
      }
      toast.success(
        "Série cancelada",
        `${res.cancelled} atendimento(s) futuro(s) foram cancelados. O que já aconteceu ficou como está.`
      );
      setConfirming(false);
      router.refresh();
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-[var(--color-text-subtle)]" />
          Parte de uma série {label}
        </h2>
      </div>
      <div className="card-body space-y-3">
        <p className="text-sm text-[var(--color-text)]">
          São <strong>{series.total}</strong> atendimentos nesta série.{" "}
          {series.upcoming > 0 ? (
            <>
              <strong>{series.upcoming}</strong> ainda por vir
              {series.lastDate && <>, até {series.lastDate.split("-").reverse().join("/")}</>}.
            </>
          ) : (
            <>Nenhum ainda por vir.</>
          )}
        </p>

        {series.upcoming > 0 && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="btn btn-secondary btn-sm"
          >
            Cancelar os {series.upcoming} restantes
          </button>
        )}

        {confirming && (
          <div className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3 space-y-2">
            {/* O que NÃO acontece precisa estar dito antes do clique: quem
                cancela uma série teme desfazer o que já foi atendido e pago. */}
            <p className="text-sm text-[var(--color-text)]">
              Cancelar {series.upcoming} atendimento(s) futuro(s)?
            </p>
            <p
              className="text-[var(--color-text-muted)]"
              style={{ fontSize: "var(--text-2xs)" }}
            >
              O que já aconteceu não é tocado. Vale-presente e sessões de plano usados nos
              cancelados voltam para o cliente. Cobrança no cartão não é estornada aqui —
              na série, só o primeiro atendimento é cobrado, e o estorno dele fica no
              botão de cancelar daquele.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelSeries}
                disabled={isPending}
                className="btn btn-destructive btn-sm"
              >
                {isPending ? "Cancelando…" : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={isPending}
                className="btn btn-secondary btn-sm"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
