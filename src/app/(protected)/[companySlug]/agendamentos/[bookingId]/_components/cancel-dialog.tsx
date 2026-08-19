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
        className="px-3 py-1.5 text-sm border border-[var(--color-danger-border)] text-[var(--color-danger)] rounded-[var(--radius-control)] hover:bg-[var(--color-danger-light)] transition-colors font-medium"
      >
        Cancelar agendamento
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        className="rounded-[var(--radius-control)] border border-[var(--color-border)] shadow-xl p-0 backdrop:bg-black/40 max-w-md w-full"
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 border-b border-[var(--color-border)]">
            <h2 className="text-base font-semibold text-[var(--color-text-heading)]">
              Cancelar agendamento
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Esta ação não pode ser desfeita. Se o pagamento foi realizado por cartão, um
              reembolso será processado automaticamente.
            </p>
          </div>

          <div className="px-6 py-4">
            <label
              htmlFor="cancel-reason"
              className="block text-sm text-[var(--color-text-muted)] mb-1.5"
            >
              Motivo do cancelamento (opcional)
            </label>
            <textarea
              id="cancel-reason"
              name="reason"
              rows={3}
              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] resize-none"
              placeholder="Ex.: cliente solicitou cancelamento…"
            />
            {error && (
              <p role="alert" className="text-sm text-[var(--color-danger)] mt-2">
                {error}
              </p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[var(--color-border)] flex gap-3 justify-end">
            <button
              type="button"
              onClick={closeDialog}
              className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-[var(--radius-control)] text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 text-sm bg-[var(--color-danger)] text-white font-semibold rounded-[var(--radius-control)] hover:bg-[var(--color-danger)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? "Cancelando…" : "Confirmar cancelamento"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
