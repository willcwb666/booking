"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getCompanyOpenBookingsAction,
  updateBookingStatusDirectAction,
  submitPresetResetRequestAction,
} from "@/server/actions/preset-reset-request";
import { getPlatformSettingsAction } from "@/server/actions/admin-settings";
import { toast } from "@/lib/toast-service";
import { RotateCcw, AlertTriangle, CheckCircle2, DollarSign } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  isOpen: boolean;
  onClose: () => void;
};

type OpenBooking = {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  status: string;
};

export function PresetResetRequestModal({ companySlug, isOpen, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [openBookings, setOpenBookings] = useState<OpenBooking[]>([]);
  const [observation, setObservation] = useState("");
  const [presetResetFee, setPresetResetFee] = useState<number>(49.9);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadFee() {
      const res = await getPlatformSettingsAction();
      if (res.success) {
        setPresetResetFee(res.presetResetFee);
      }
    }
    if (isOpen) loadFee();
  }, [isOpen]);

  if (!isOpen) return null;

  async function checkOpenBookings() {
    startTransition(async () => {
      const res = await getCompanyOpenBookingsAction(companySlug);
      if (res.success) {
        setOpenBookings(res.bookings || []);
        if (res.bookings && res.bookings.length > 0) {
          setStep(2);
        } else {
          setStep(3);
        }
      }
    });
  }

  function handleResolveStatus(bookingId: string, status: "COMPLETED" | "CANCELLED") {
    startTransition(async () => {
      const res = await updateBookingStatusDirectAction(companySlug, bookingId, status);
      if (res.success) {
        toast.success("Atualizado", `Agendamento alterado para ${status === "COMPLETED" ? "Concluído" : "Cancelado"}`);
        const checkRes = await getCompanyOpenBookingsAction(companySlug);
        if (checkRes.success) {
          setOpenBookings(checkRes.bookings || []);
          if (!checkRes.bookings || checkRes.bookings.length === 0) {
            setStep(3);
          }
        }
      }
    });
  }

  function handleSubmitRequest() {
    startTransition(async () => {
      const res = await submitPresetResetRequestAction(companySlug, observation);
      if (res.success) {
        toast.success("Enviado!", res.message || "Solicitação enviada com sucesso.");
        onClose();
        setStep(1);
        setObservation("");
      } else {
        toast.error("Atenção", res.error || "Falha ao enviar solicitação.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-navy)] backdrop-blur-xs animate-fadeIn">
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-left">
        
        {/* Header do Passo */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[var(--text-2xs)] font-semibold text-[var(--color-primary)] uppercase tracking-wider block">
                Passo {step} de 3
              </span>
              <h3 className="text-base font-semibold text-[var(--color-text-heading)]">
                {step === 1 && "Solicitar Reset de Presets"}
                {step === 2 && "Agendamentos em Aberto Detectados"}
                {step === 3 && "Motivo / Pagamento da Solicitação"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)] text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* PASSO 1: Informações e Garantia sem perda de dados */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              O reset de presets restaurará o seu catálogo de serviços de volta à configuração padrão do segmento, sem que você perca nenhum dado cadastrado (clientes, histórico ou relatórios).
            </p>

            {presetResetFee > 0 && (
              <div className="p-3.5 bg-[var(--color-primary-light)] border border-[var(--color-primary)] rounded-[var(--radius-control)] text-xs text-[var(--color-text-heading)] flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                  <span>Taxa de Reconfiguração do Catálogo:</span>
                </div>
                <span className="text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-bg)] px-2.5 py-1 rounded-[var(--radius-control)] border border-[var(--color-primary)] shadow-2xs">
                  R$ {presetResetFee.toFixed(2)}
                </span>
              </div>
            )}

            <div className="p-3.5 bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-[var(--radius-control)] text-[var(--text-2xs)] text-[var(--color-warning)] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                <span>Requisito Obrigatório:</span>
              </div>
              <p className="pl-5">A solicitação só poderá ser enviada se não houver agendamentos em aberto no momento.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] font-semibold text-xs rounded-[var(--radius-control)] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={checkOpenBookings}
                disabled={isPending}
                className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs rounded-[var(--radius-control)] shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Verificando agendamentos..." : "Verificar e Continuar ➔"}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: Resolução Direta de Agendamentos em Aberto */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-text-muted)]">
              Detectamos <strong>{openBookings.length} agendamento(s) em aberto</strong>. Finalize ou cancele cada um para liberar a solicitação de reset:
            </p>

            <div className="max-h-60 overflow-y-auto divide-y divide-[var(--color-border)] border border-[var(--color-border)] rounded-[var(--radius-control)] p-2 bg-[var(--color-bg-subtle)]">
              {openBookings.map((b) => (
                <div key={b.id} className="py-2.5 px-2 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-[var(--color-text-heading)]">{b.customerName}</p>
                    <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)]">
                      {b.serviceName} · {b.scheduledDate} às {b.scheduledStartTime}
                    </p>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResolveStatus(b.id, "COMPLETED")}
                      disabled={isPending}
                      className="px-2.5 py-1 bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white font-semibold text-[var(--text-2xs)] rounded-[var(--radius-control)] shadow-2xs"
                    >
                      Finalizar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveStatus(b.id, "CANCELLED")}
                      disabled={isPending}
                      className="px-2.5 py-1 bg-[var(--color-danger)] hover:bg-[var(--color-danger)] text-white font-semibold text-[var(--text-2xs)] rounded-[var(--radius-control)] shadow-2xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] font-semibold text-xs rounded-[var(--radius-control)]"
              >
                Voltar / Cancelar
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: Observação e Envio da Solicitação */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3.5 bg-[var(--color-success-light)] border border-[var(--color-success-border)] rounded-[var(--radius-control)] text-[var(--text-2xs)] text-[var(--color-success)] font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" />
              <span>Nenhum agendamento em aberto! Sua solicitação está liberada para envio ao Super Admin.</span>
            </div>

            <div>
              <label htmlFor="observation" className="block text-xs font-bold text-[var(--color-text)] mb-1">
                Observação / Motivo do Reset (Opcional)
              </label>
              <textarea
                id="observation"
                rows={3}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Gostaria de restaurar os serviços padrão porque editei os valores incorretamente."
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {presetResetFee > 0 && (
              <div className="p-3 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] text-[var(--text-2xs)] text-[var(--color-text-muted)] flex items-center justify-between font-medium">
                <span>Taxa de Serviço:</span>
                <span className="font-bold text-[var(--color-text-heading)]">R$ {presetResetFee.toFixed(2)} (Cobrança Stripe)</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text)] font-semibold text-xs rounded-[var(--radius-control)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={isPending}
                className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs rounded-[var(--radius-control)] shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <span>{isPending ? "Processando..." : presetResetFee > 0 ? `💳 Efetuar Pagamento R$ ${presetResetFee.toFixed(2)} & Solicitar ➔` : "Enviar Solicitação ao Super Admin ➔"}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
