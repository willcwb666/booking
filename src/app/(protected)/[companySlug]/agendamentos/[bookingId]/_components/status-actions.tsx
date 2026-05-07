"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { updateBookingStatusAction } from "@/server/actions/booking";

type Props = {
  bookingId: string;
  companySlug: string;
  currentStatus: string;
};

const TRANSITIONS: Record<string, { label: string; next: string; color: string }> = {
  CONFIRMED: {
    label: "Iniciar atendimento",
    next: "IN_PROGRESS",
    color: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  IN_PROGRESS: {
    label: "Marcar como concluído",
    next: "COMPLETED",
    color: "bg-green-600 hover:bg-green-700 text-white",
  },
};

export function StatusActions({ bookingId, companySlug, currentStatus }: Props) {
  const transition = TRANSITIONS[currentStatus];
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!transition) return null;

  function handleAdvance() {
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

  return (
    <div>
      <button
        onClick={handleAdvance}
        disabled={pending}
        className={[
          "px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          transition.color,
        ].join(" ")}
      >
        {pending ? "Atualizando…" : transition.label}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
