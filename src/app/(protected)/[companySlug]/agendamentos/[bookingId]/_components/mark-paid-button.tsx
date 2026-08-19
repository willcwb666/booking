"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { markBookingPaidAction } from "@/server/actions/booking";

type Props = {
  bookingId: string;
  companySlug: string;
};

export function MarkPaidButton({ bookingId, companySlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  function handleClick() {
    if (!confirm) { setConfirm(true); return; }
    setError(null);
    startTransition(async () => {
      const result = await markBookingPaidAction(bookingId, companySlug);
      if (!result.success) { setError(result.error); setConfirm(false); return; }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`px-3 py-1.5 text-sm font-medium rounded-[var(--radius-control)] border transition-colors disabled:opacity-50 ${
          confirm
            ? "bg-[var(--color-success)] text-white border-[var(--color-success-border)] hover:bg-[var(--color-success)]"
            : "text-[var(--color-success)] bg-[var(--color-success-light)] border-[var(--color-success-border)] hover:bg-[var(--color-success-light)]"
        }`}
      >
        {pending ? "Salvando…" : confirm ? "Confirmar recebimento" : "Marcar como pago"}
      </button>
      {confirm && !pending && (
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
