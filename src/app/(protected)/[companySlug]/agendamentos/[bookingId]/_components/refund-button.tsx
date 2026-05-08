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
      <span className="text-sm text-green-700 font-medium">Reembolso enviado</span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
          confirm
            ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
            : "text-red-600 bg-red-50 border-red-200 hover:bg-red-100"
        }`}
      >
        {pending ? "Processando…" : confirm ? "Confirmar reembolso" : "Reembolsar"}
      </button>
      {confirm && !pending && (
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
