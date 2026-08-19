"use client";

import { useTransition, useState } from "react";
import { refundBookingAction } from "@/server/actions/booking";

type Props = {
  bookingId: string;
  companySlug: string;
};

export function RefundButton({ bookingId, companySlug }: Props) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  function handleClick() {
    if (!confirm) { setConfirm(true); return; }
    setError(null);
    startTransition(async () => {
      const result = await refundBookingAction(bookingId, companySlug);
      if (!result.success) { setError(result.error); setConfirm(false); return; }
      setDone(true);
    });
  }

  if (done) {
    return (
      <span className="text-sm text-[var(--color-success)] font-medium">Reembolso enviado</span>
    );
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
            ? "bg-[var(--color-danger)] text-white border-[var(--color-danger-border)] hover:bg-[var(--color-danger)]"
            : "text-[var(--color-danger)] bg-[var(--color-danger-light)] border-[var(--color-danger-border)] hover:bg-[var(--color-danger-light)]"
        }`}
      >
        {pending ? "Processando…" : confirm ? "Confirmar reembolso" : "Reembolsar"}
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
