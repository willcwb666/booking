"use client";

import { useState, useTransition } from "react";
import { joinWaitlistAction } from "@/server/actions/waitlist";

type Config = { id: string; name: string };

export function WaitlistForm({
  configs,
  defaultConfigId,
}: {
  configs: Config[];
  defaultConfigId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await joinWaitlistAction(fd);
      if (!res.success) { setError(res.error); return; }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="font-semibold text-gray-900">Você entrou na lista!</p>
        <p className="text-sm text-gray-500 mt-1">Você será notificado quando uma vaga abrir.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Serviço</label>
        <select
          name="bookingConfigId"
          defaultValue={defaultConfigId ?? configs[0]?.id}
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {configs.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Data preferida</label>
        <input
          name="preferredDate"
          type="date"
          required
          min={new Date().toISOString().split("T")[0]}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Horário preferido (opcional)</label>
        <input
          name="preferredStartTime"
          type="time"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Seu nome</label>
        <input
          name="customerName"
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">E-mail</label>
        <input
          name="customerEmail"
          type="email"
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Telefone (opcional)</label>
        <input
          name="customerPhone"
          type="tel"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {pending ? "Enviando…" : "Entrar na lista de espera"}
      </button>
    </form>
  );
}
