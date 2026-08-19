"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { updateBookingStatusAction } from "@/server/actions/booking";
import { CompletionModal } from "./completion-modal";

type Props = {
  bookingId: string;
  companySlug: string;
  currentStatus: string;
  originalTotal?: number;
  currency?: string;
  availableServices?: string[];
  isFuture?: boolean;
};

const TRANSITIONS: Record<string, { label: string; next: string; color: string }> = {
  CONFIRMED: {
    label: "Iniciar atendimento",
    next: "IN_PROGRESS",
    color: "bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white",
  },
  IN_PROGRESS: {
    label: "Concluir & Fechamento",
    next: "COMPLETED",
    color: "bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white",
  },
};

export function StatusActions({
  bookingId,
  companySlug,
  currentStatus,
  originalTotal = 0,
  currency = "BRL",
  availableServices = [],
  isFuture = false,
}: Props) {
  const transition = TRANSITIONS[currentStatus];
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const router = useRouter();

  if (isFuture) {
    return (
      <span className="text-xs text-[var(--color-warning)] bg-[var(--color-warning-light)] px-2.5 py-1.5 rounded-[var(--radius-control)] border border-[var(--color-warning-border)] font-medium inline-flex items-center gap-1">
        <span>🗓️</span> Data Futura
      </span>
    );
  }

  if (!transition) return null;

  function handleClick() {
    if (currentStatus === "IN_PROGRESS") {
      // Abre o modal de fechamento com acréscimos e descontos
      setShowCompletionModal(true);
    } else {
      startTransition(async () => {
        const result = await updateBookingStatusAction(
          bookingId,
          companySlug,
          transition.next
        );
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.refresh();
      });
    }
  }

  return (
    <>
      <div>
        <button
          onClick={handleClick}
          disabled={pending}
          className={[
            "px-4 py-2 text-sm font-semibold rounded-[var(--radius-control)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
            transition.color,
          ].join(" ")}
        >
          {pending ? "Atualizando…" : transition.label}
        </button>
        {error && (
          <p role="alert" className="text-xs text-[var(--color-danger)] mt-1">{error}</p>
        )}
      </div>

      {showCompletionModal && (
        <CompletionModal
          bookingId={bookingId}
          companySlug={companySlug}
          originalTotal={originalTotal}
          currency={currency}
          availableServices={availableServices}
          onClose={() => setShowCompletionModal(false)}
        />
      )}
    </>
  );
}
