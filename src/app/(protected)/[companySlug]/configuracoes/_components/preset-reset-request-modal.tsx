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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-left">
        
        {/* Header do Passo */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                Passo {step} de 3
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                {step === 1 && "Solicitar Reset de Presets"}
                {step === 2 && "Agendamentos em Aberto Detectados"}
                {step === 3 && "Motivo / Pagamento da Solicitação"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* PASSO 1: Informações e Garantia sem perda de dados */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              O reset de presets restaurará o seu catálogo de serviços de volta à configuração padrão do segmento, sem que você perca nenhum dado cadastrado (clientes, histórico ou relatórios).
            </p>

            {presetResetFee > 0 && (
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-xl text-xs text-indigo-900 flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Taxa de Reconfiguração do Catálogo:</span>
                </div>
                <span className="text-sm font-extrabold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                  R$ {presetResetFee.toFixed(2)}
                </span>
              </div>
            )}

            <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Requisito Obrigatório:</span>
              </div>
              <p className="pl-5">A solicitação só poderá ser enviada se não houver agendamentos em aberto no momento.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={checkOpenBookings}
                disabled={isPending}
                className="px-5 py-2.5 bg-[#635bff] hover:bg-[#544dc9] text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Verificando agendamentos..." : "Verificar e Continuar ➔"}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 2: Resolução Direta de Agendamentos em Aberto */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Detectamos <strong>{openBookings.length} agendamento(s) em aberto</strong>. Finalize ou cancele cada um para liberar a solicitação de reset:
            </p>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {openBookings.map((b) => (
                <div key={b.id} className="py-2.5 px-2 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{b.customerName}</p>
                    <p className="text-[11px] text-slate-500">
                      {b.serviceName} · {b.scheduledDate} às {b.scheduledStartTime}
                    </p>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResolveStatus(b.id, "COMPLETED")}
                      disabled={isPending}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded-lg shadow-2xs"
                    >
                      Finalizar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveStatus(b.id, "CANCELLED")}
                      disabled={isPending}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] rounded-lg shadow-2xs"
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Voltar / Cancelar
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: Observação e Envio da Solicitação */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Nenhum agendamento em aberto! Sua solicitação está liberada para envio ao Super Admin.</span>
            </div>

            <div>
              <label htmlFor="observation" className="block text-xs font-bold text-slate-700 mb-1">
                Observação / Motivo do Reset (Opcional)
              </label>
              <textarea
                id="observation"
                rows={3}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Gostaria de restaurar os serviços padrão porque editei os valores incorretamente."
                className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {presetResetFee > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between font-medium">
                <span>Taxa de Serviço:</span>
                <span className="font-bold text-slate-900">R$ {presetResetFee.toFixed(2)} (Cobrança Stripe)</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={isPending}
                className="px-6 py-2.5 bg-[#635bff] hover:bg-[#544dc9] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
