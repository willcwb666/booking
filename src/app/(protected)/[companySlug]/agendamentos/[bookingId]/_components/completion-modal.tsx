"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeBookingWithAdjustmentsAction,
  ExtraItemInput,
} from "@/server/actions/booking";
import { toast } from "@/lib/toast-service";

type Props = {
  bookingId: string;
  companySlug: string;
  originalTotal: number;
  currency: string;
  onClose: () => void;
};

export function CompletionModal({
  bookingId,
  companySlug,
  originalTotal,
  currency,
  onClose,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [additionalItems, setAdditionalItems] = useState<ExtraItemInput[]>([]);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [discountValue, setDiscountValue] = useState<string>("0");
  const [discountReason, setDiscountReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleAddExtra() {
    if (!newDesc.trim() || !newAmount || Number(newAmount) <= 0) return;
    setAdditionalItems((prev) => [
      ...prev,
      { description: newDesc.trim(), amount: parseFloat(newAmount) },
    ]);
    setNewDesc("");
    setNewAmount("");
  }

  function handleRemoveExtra(index: number) {
    setAdditionalItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Cálculos em tempo real
  const additionalsTotal = additionalItems.reduce((acc, item) => acc + item.amount, 0);
  const subtotal = originalTotal + additionalsTotal;

  const numericDiscountVal = parseFloat(discountValue) || 0;
  let discountCalculated = 0;
  if (discountType === "PERCENTAGE") {
    discountCalculated = (subtotal * numericDiscountVal) / 100;
  } else {
    discountCalculated = numericDiscountVal;
  }

  const finalTotal = Math.max(0, subtotal - discountCalculated);
  const difference = finalTotal - originalTotal;

  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit() {
    if (isSubmitting || isPending) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    startTransition(async () => {
      const res = await completeBookingWithAdjustmentsAction({
        bookingId,
        companySlug,
        additionalItems,
        discountType,
        discountValue: numericDiscountVal,
        discountReason,
      });

      if (res.success) {
        toast.success(
          "Atendimento Concluído!",
          difference < 0
            ? `Fechamento finalizado com reembolso de ${currency} ${Math.abs(difference).toFixed(2)}`
            : "Agendamento finalizado com sucesso."
        );
        onClose();
        router.refresh();
      } else {
        toast.error("Erro na Conclusão", res.error || "Falha ao concluir atendimento.");
        setErrorMsg(res.error || "Erro ao concluir atendimento.");
        setIsSubmitting(false);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Concluir Atendimento & Fechamento</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Adicione serviços extras realizados na hora ou aplique descontos de ajuste.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* 1. Adicionar Serviços Extras na hora */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
            + Adicionar Serviços / Horas Extras
          </label>
          <div className="flex gap-2">
            <input
              placeholder="Ex: +1h Extra de Limpeza, Limpeza de Geladeira"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <input
              type="number"
              placeholder="Valor"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-24 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={handleAddExtra}
              className="bg-stone-900 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors shrink-0"
            >
              + Adicionar
            </button>
          </div>

          {/* Lista de itens adicionados */}
          {additionalItems.length > 0 && (
            <ul className="space-y-1.5 pt-2">
              {additionalItems.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between text-xs bg-stone-50 rounded-lg p-2 border border-stone-200"
                >
                  <span className="font-medium text-stone-800">{item.description}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">
                      + {currency} {item.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleRemoveExtra(idx)}
                      className="text-red-500 hover:text-red-700 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 2. Desconto em Porcentagem ou Valor Fixo */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
            - Aplicar Desconto (Ajuste ou Reclamação)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Tipo de Desconto</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="FIXED">Valor Fixo ({currency})</option>
                <option value="PERCENTAGE">Porcentagem (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Valor do Desconto</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Resumo Financeiro do Fechamento */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Valor Pago Adiantado (Orçamento):</span>
            <span className="font-semibold">{currency} {originalTotal.toFixed(2)}</span>
          </div>

          {additionalsTotal > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>+ Adicionais da Limpeza:</span>
              <span className="font-bold">+ {currency} {additionalsTotal.toFixed(2)}</span>
            </div>
          )}

          {discountCalculated > 0 && (
            <div className="flex justify-between text-red-600">
              <span>- Desconto Aplicado ({discountType === "PERCENTAGE" ? `${numericDiscountVal}%` : "Fixo"}):</span>
              <span className="font-bold">- {currency} {discountCalculated.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-extrabold text-stone-900 border-t border-stone-200 pt-2 mt-2">
            <span>Total Final do Fechamento:</span>
            <span>{currency} {finalTotal.toFixed(2)}</span>
          </div>

          {difference < 0 && (
            <p className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-2">
              💡 Reembolso automático Stripe: O cliente receberá {currency} {Math.abs(difference).toFixed(2)} de volta no cartão.
            </p>
          )}

          {difference > 0 && (
            <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
              💡 Acerto complementar: O valor adicional de {currency} {difference.toFixed(2)} será registrado para acerto.
            </p>
          )}
        </div>

        {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}

        {/* Footer actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || isSubmitting}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isSubmitting ? "Concluindo..." : "Confirmar & Finalizar Atendimento"}
          </button>
        </div>

      </div>
    </div>
  );
}
