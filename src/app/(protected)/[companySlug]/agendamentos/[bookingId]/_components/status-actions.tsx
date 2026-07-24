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
};

const TRANSITIONS: Record<string, { label: string; next: string; color: string }> = {
  CONFIRMED: {
    label: "Iniciar atendimento",
    next: "IN_PROGRESS",
    color: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  IN_PROGRESS: {
    label: "Concluir & Fechamento",
    next: "COMPLETED",
    color: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
};

export function StatusActions({
  bookingId,
  companySlug,
  currentStatus,
  originalTotal = 0,
  currency = "BRL",
}: Props) {
  const transition = TRANSITIONS[currentStatus];
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const router = useRouter();

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
            "px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
            transition.color,
          ].join(" ")}
        >
          {pending ? "Atualizando…" : transition.label}
        </button>
        {error && (
          <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>

      {showCompletionModal && (
        <CompletionModal
          bookingId={bookingId}
          companySlug={companySlug}
          originalTotal={originalTotal}
          currency={currency}
          onClose={() => setShowCompletionModal(false)}
        />
      )}
    </>
  );
}
