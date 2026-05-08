"use client";

import { useTransition, useState } from "react";
import { addAgendaExceptionAction, removeAgendaExceptionAction } from "@/server/actions/agenda-exceptions";

type Exception = {
  id: string;
  date: string;
  type: string;
  reason: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
};

type Props = {
  companySlug: string;
  agendaId: string;
  exceptions: Exception[];
  canEdit: boolean;
};

export function ExcecoesClient({ companySlug, agendaId, exceptions: initial, canEdit }: Props) {
  const [exceptions, setExceptions] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("BLOCKED_DAY");

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("companySlug", companySlug);
    fd.set("agendaId", agendaId);
    startTransition(async () => {
      const res = await addAgendaExceptionAction(fd);
      if (!res.success) { setError(res.error); return; }
      window.location.reload();
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removeAgendaExceptionAction(id, companySlug);
      if (!res.success) return;
      setExceptions((prev) => prev.filter((ex) => ex.id !== id));
    });
  }

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Adicionar exceção</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data</label>
                <input name="date" type="date" required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tipo</label>
                <select name="type" value={type} onChange={(e) => setType(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="BLOCKED_DAY">Dia bloqueado</option>
                  <option value="CUSTOM_HOURS">Horário especial</option>
                </select>
              </div>
            </div>
            {type === "CUSTOM_HOURS" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Início</label>
                  <input name="startTime" type="time" required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Fim</label>
                  <input name="endTime" type="time" required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Motivo (opcional)</label>
              <input name="reason" type="text" maxLength={100} placeholder="Ex: Feriado, reunião..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={pending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {pending ? "Salvando…" : "Adicionar exceção"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Exceções cadastradas {exceptions.length > 0 && <span className="text-gray-400 font-normal">({exceptions.length})</span>}
        </h2>
        {exceptions.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma exceção cadastrada.</p>
        ) : (
          <ul className="space-y-2">
            {exceptions.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {ex.date.split("-").reverse().join("/")}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                      ex.type === "BLOCKED_DAY" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {ex.type === "BLOCKED_DAY" ? "Bloqueado" : `${ex.startTime}–${ex.endTime}`}
                    </span>
                  </p>
                  {ex.reason && <p className="text-xs text-gray-500 mt-0.5">{ex.reason}</p>}
                </div>
                {canEdit && (
                  <button type="button" onClick={() => handleRemove(ex.id)} disabled={pending}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors ml-3 shrink-0">
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
