"use client";

import React, { useState, useEffect } from "react";
import { RotateCcw, Info, CheckCircle2, DollarSign } from "@/components/ui/icons";
import { getPlatformSettingsAction } from "@/server/actions/admin-settings";

type Props = {
  canEdit: boolean;
  onRequestReset: () => void;
};

export function ResetTab({ canEdit, onRequestReset }: Props) {
  const [presetResetFee, setPresetResetFee] = useState<number>(49.9);

  useEffect(() => {
    async function loadFee() {
      const res = await getPlatformSettingsAction();
      if (res.success) {
        setPresetResetFee(res.presetResetFee);
      }
    }
    loadFee();
  }, []);

  return (
    <div className="space-y-6 text-left">
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-heading)]">Solicitar Reset de Presets</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Restaure o catálogo de serviços da sua empresa para o padrão original do segmento.
              </p>
            </div>
          </div>

          {presetResetFee > 0 && (
            <div className="p-3 bg-[var(--color-primary-light)] border border-[var(--color-border)] rounded-[var(--radius-card)] text-right">
              <span className="text-[var(--text-2xs)] text-[var(--color-primary)] font-bold uppercase tracking-wider block">Taxa Oficial</span>
              <span className="text-sm font-semibold text-[var(--color-primary)]">R$ {presetResetFee.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="space-y-4 text-xs text-[var(--color-text)] leading-relaxed border-t border-[var(--color-border)] pt-4">
          <p>
            Caso você tenha editado preços ou serviços incorretamente e deseje retornar à configuração inicial do seu nicho de negócio, é possível solicitar o reset do catálogo ao Super Admin.
          </p>
          <div className="p-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-card)] space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-[var(--color-text-heading)]">
              <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
              <span>Como funciona o reset:</span>
            </div>
            <ul className="space-y-1.5 text-[var(--color-text)] pl-6">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0 mt-0.5" />
                <span><strong>Sem perda de dados:</strong> Seus clientes cadastrados, histórico de agendamentos e faturamento continuam intactos.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0 mt-0.5" />
                <span><strong>Apenas o Catálogo:</strong> Apenas os serviços e extras serão restaurados para o preset original.</span>
              </li>
              <li className="flex items-start gap-2">
                <DollarSign className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <span><strong>Taxa de Serviço:</strong> {presetResetFee > 0 ? `Processado via Stripe Checkout por R$ ${presetResetFee.toFixed(2)}.` : "Serviço oferecido gratuitamente nesta plataforma."}</span>
              </li>
            </ul>
          </div>
        </div>

        {canEdit && (
          <div className="pt-2 flex justify-start">
            <button
              type="button"
              onClick={onRequestReset}
              className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs rounded-[var(--radius-control)] shadow-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{presetResetFee > 0 ? `Solicitar Reset de Presets (R$ ${presetResetFee.toFixed(2)})` : "Solicitar Reset ao Super Admin"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
