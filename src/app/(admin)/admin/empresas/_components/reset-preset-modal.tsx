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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-navy)]/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-left">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-[var(--radius-card)] bg-[var(--color-warning-light)] text-[var(--color-warning)] flex items-center justify-center text-xl font-bold">
            
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-heading)]">Resetar Catálogo de Serviços?</h2>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Você está prestes a resetar todos os serviços cadastrados na empresa{" "}
            <strong className="text-[var(--color-text-heading)]">{company.name}</strong> para o catálogo padrão do segmento{" "}
            <span className="font-mono text-[var(--color-warning)] font-bold">{company.businessType}</span>.
          </p>
          <div className="p-3 bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-[var(--radius-control)] text-[var(--text-2xs)] text-[var(--color-warning)]">
            <strong>Atenção:</strong> Os serviços existentes editados ou criados pela empresa serão substituídos pelos serviços padrão do sistema.
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2.5 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] font-bold text-xs rounded-[var(--radius-control)] transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmReset}
            disabled={isPending}
            className="px-5 py-2.5 bg-[var(--color-warning)] hover:bg-[var(--color-warning)] text-white font-bold text-xs rounded-[var(--radius-control)] shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Resetando..." : "Sim, Resetar Serviços"}
          </button>
        </div>
      </div>
    </div>
  );
}
