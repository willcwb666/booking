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
        className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
      >
        Reagendar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-base font-bold text-gray-900 mb-4">Reagendar</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nova data</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {date && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Horário disponível
                  </label>
                  {loadingSlots ? (
                    <p className="text-xs text-gray-400">Carregando horários…</p>
                  ) : slots.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum horário disponível</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((s) => (
                        <button
                          key={s.startTime}
                          type="button"
                          onClick={() => setSelectedSlot(s)}
                          className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                            selectedSlot?.startTime === s.startTime
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {s.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!date || !selectedSlot || pending}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
