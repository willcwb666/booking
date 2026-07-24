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
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${
          confirm
            ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
            : "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
        }`}
      >
        {pending ? "Salvando…" : confirm ? "Confirmar recebimento" : "Marcar como pago"}
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
