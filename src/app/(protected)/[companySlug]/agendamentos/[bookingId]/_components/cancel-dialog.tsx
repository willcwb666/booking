"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelBookingAction } from "@/server/actions/booking";

type Props = {
  bookingId: string;
  companySlug: string;
};

export function CancelDialog({ bookingId, companySlug }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) closeDialog();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("bookingId", bookingId);
    fd.set("companySlug", companySlug);

    startTransition(async () => {
      const result = await cancelBookingAction(fd);
      if (!result.success) {
        setError(result.errors._?.[0] ?? "Erro ao cancelar");
        return;
      }
      closeDialog();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
      >
        Cancelar agendamento
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="rounded-xl border border-gray-200 shadow-xl p-0 backdrop:bg-black/40 max-w-md w-full"
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">
              Cancelar agendamento
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Esta ação não pode ser desfeita. Se o pagamento foi realizado por cartão, um
              reembolso será processado automaticamente.
            </p>
          </div>

          <div className="px-6 py-4">
            <label
              htmlFor="cancel-reason"
              className="block text-sm text-gray-600 mb-1.5"
            >
              Motivo do cancelamento (opcional)
            </label>
            <textarea
              id="cancel-reason"
              name="reason"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              placeholder="Ex.: cliente solicitou cancelamento…"
            />
            {error && (
              <p role="alert" className="text-sm text-red-600 mt-2">
                {error}
              </p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
            <button
              type="button"
              onClick={closeDialog}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? "Cancelando…" : "Confirmar cancelamento"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
