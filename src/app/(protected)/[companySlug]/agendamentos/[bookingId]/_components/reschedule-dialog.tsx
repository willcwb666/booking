"use client";

import { useState, useTransition } from "react";
import { rescheduleBookingAction } from "@/server/actions/booking";

type Props = {
  bookingId: string;
  companySlug: string;
  agendaId: string;
};

type Slot = { startTime: string; endTime: string };

export function RescheduleDialog({ bookingId, companySlug, agendaId }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleDateChange(d: string) {
    setDate(d);
    setSelectedSlot(null);
    setSlots([]);
    if (!d) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/mobile/slots?agendaId=${agendaId}&date=${d}`
      );
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleSubmit() {
    if (!date || !selectedSlot) return;
    setError(null);
    startTransition(async () => {
      const result = await rescheduleBookingAction(
        bookingId,
        companySlug,
        date,
        selectedSlot.startTime,
        selectedSlot.endTime
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      window.location.reload();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm font-medium text-[var(--color-info)] bg-[var(--color-info-light)] border border-[var(--color-info-border)] rounded-[var(--radius-control)] hover:bg-[var(--color-info-light)] transition-colors"
      >
        Reagendar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-card)] shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-base font-bold text-[var(--color-text-heading)] mb-4">Reagendar</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Nova data</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                />
              </div>

              {date && (
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1">
                    Horário disponível
                  </label>
                  {loadingSlots ? (
                    <p className="text-xs text-[var(--color-text-subtle)]">Carregando horários…</p>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-subtle)]">Nenhum horário disponível</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.startTime}
                          type="button"
                          onClick={() => setSelectedSlot(s)}
                          className={`py-2 rounded-[var(--radius-control)] text-xs font-medium border transition-colors ${
                            selectedSlot?.startTime === s.startTime
                              ? "bg-[var(--color-info)] text-white border-[var(--color-info-border)]"
                              : "border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
                          }`}
                        >
                          {s.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 text-sm text-[var(--color-text)] border border-[var(--color-border)] rounded-[var(--radius-control)] hover:bg-[var(--color-bg-subtle)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!date || !selectedSlot || pending}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-[var(--color-info)] rounded-[var(--radius-control)] hover:bg-[var(--color-info)] disabled:opacity-50 transition-colors"
              >
                {pending ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
