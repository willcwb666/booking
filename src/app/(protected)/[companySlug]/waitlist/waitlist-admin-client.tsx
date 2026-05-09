"use client";

import { useState, useTransition } from "react";
import { removeWaitlistEntryAction } from "@/server/actions/waitlist";

const STATUS_LABELS: Record<string, string> = {
  WAITING: "Aguardando",
  NOTIFIED: "Notificado",
  BOOKED: "Agendado",
  EXPIRED: "Expirado",
};

const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-yellow-100 text-yellow-800",
  NOTIFIED: "bg-blue-100 text-blue-800",
  BOOKED: "bg-green-100 text-green-800",
  EXPIRED: "bg-gray-100 text-gray-500",
};

type Entry = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  preferredDate: string;
  preferredStartTime: string | null;
  status: string;
  configName: string;
  notifiedAt: string | null;
  createdAt: string;
};

export function WaitlistAdminClient({
  entries: initial,
  companySlug,
  canEdit,
}: {
  entries: Entry[];
  companySlug: string;
  canEdit: boolean;
}) {
  const [entries, setEntries] = useState(initial);
  const [pending, startTransition] = useTransition();

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removeWaitlistEntryAction(id, companySlug);
      if (res.success) setEntries((prev) => prev.filter((e) => e.id !== id));
    });
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-sm">Nenhum cliente na lista de espera.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Serviço</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data preferida</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{e.customerName}</p>
                  <p className="text-xs text-gray-400">{e.customerEmail}</p>
                  {e.customerPhone && <p className="text-xs text-gray-400">{e.customerPhone}</p>}
                </td>
                <td className="px-4 py-3 text-gray-700">{e.configName}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <p className="text-gray-900">{e.preferredDate.split("-").reverse().join("/")}</p>
                  {e.preferredStartTime && (
                    <p className="text-xs text-gray-400">{e.preferredStartTime}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[e.status] ?? e.status}
                  </span>
                  {e.notifiedAt && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Notif. {new Date(e.notifiedAt).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(e.id)}
                      disabled={pending}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                    >
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
