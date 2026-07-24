"use client";

import React, { useTransition } from "react";
import { resetCompanyPresetServicesAction } from "@/server/actions/admin-company-reset";
import { toast } from "@/lib/toast-service";

type Props = {
  company: {
    id: string;
    name: string;
    businessType: string;
  } | null;
  onClose: () => void;
};

export function ResetPresetModal({ company, onClose }: Props) {
  const [isPending, startTransition] = useTransition();

  if (!company) return null;

  function handleConfirmReset() {
    startTransition(async () => {
      const res = await resetCompanyPresetServicesAction(company!.id);
      if (res.success) {
        toast.success("Sucesso!", res.message || "Catálogo de serviços resetado.");
        onClose();
      } else {
        toast.error("Erro", res.error || "Falha ao resetar catálogo.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-left">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold">
            🔄
          </div>
          <h2 className="text-lg font-extrabold text-stone-900">Resetar Catálogo de Serviços?</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Você está prestes a resetar todos os serviços cadastrados na empresa{" "}
            <strong className="text-stone-900">{company.name}</strong> para o catálogo padrão do segmento{" "}
            <span className="font-mono text-amber-700 font-bold">{company.businessType}</span>.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
            ⚠️ <strong>Atenção:</strong> Os serviços existentes editados ou criados pela empresa serão substituídos pelos serviços padrão do sistema.
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmReset}
            disabled={isPending}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Resetando..." : "Sim, Resetar Serviços"}
          </button>
        </div>
      </div>
    </div>
  );
}
