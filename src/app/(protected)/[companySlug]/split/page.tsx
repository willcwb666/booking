"use client";

import React from "react";
import { DollarSign, CheckCircle2, Users, FileText } from "@/components/ui/icons";

export default function SplitComissoesPage() {
  return (
    <div className="w-full max-w-7xl px-6 sm:px-10 py-8 text-left space-y-8">
      <div>
        <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
          <DollarSign className="w-4 h-4" />
          <span>Módulo Extra Ativo</span>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-heading)] tracking-tight mt-1">
          Split Automático de Comissões
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Divisão instantânea de comissões por atendimento e repasse automático para cada profissional.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[var(--color-bg)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-xs space-y-2">
          <span className="text-xs font-bold text-[var(--color-text-subtle)]">Total a Repassar (Mês)</span>
          <p className="text-2xl font-semibold text-[var(--color-text-heading)]">R$ 0,00</p>
          <span className="text-[var(--text-2xs)] font-bold text-[var(--color-success)] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Split Calculado
          </span>
        </div>

        <div className="bg-[var(--color-bg)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-xs space-y-2">
          <span className="text-xs font-bold text-[var(--color-text-subtle)]">Profissionais com Split</span>
          <p className="text-2xl font-semibold text-[var(--color-primary)]">0 Profissionais</p>
          <span className="text-[var(--text-2xs)] font-medium text-[var(--color-text-muted)]">Configurado no cadastro</span>
        </div>

        <div className="bg-[var(--color-bg)] p-6 rounded-[var(--radius-panel)] border border-[var(--color-border)] shadow-xs space-y-2">
          <span className="text-xs font-bold text-[var(--color-text-subtle)]">Status do Split</span>
          <p className="text-2xl font-semibold text-[var(--color-success)]">Módulo Ativo 🚀</p>
          <span className="text-[var(--text-2xs)] font-medium text-[var(--color-text-muted)]">Liberado pelo Super Admin</span>
        </div>
      </div>

      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)] space-y-3">
        <DollarSign className="w-12 h-12 text-[var(--color-primary)] mx-auto" />
        <h3 className="text-lg font-bold text-[var(--color-text-heading)]">Gestão de Split de Comissões Habilitada</h3>
        <p className="text-xs max-w-lg mx-auto text-[var(--color-text-muted)]">
          As regras de divisão de valores por atendimento são aplicadas automaticamente em cada fechamento de comanda e agendamento.
        </p>
      </div>
    </div>
  );
}
