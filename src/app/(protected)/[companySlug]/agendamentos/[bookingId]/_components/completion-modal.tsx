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
  availableServices?: string[];
  onClose: () => void;
};

export function CompletionModal({
  bookingId,
  companySlug,
  originalTotal,
  currency,
  availableServices = [],
  onClose,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [additionalItems, setAdditionalItems] = useState<ExtraItemInput[]>([]);
  
  // Form para novos itens adicionais
  const [itemType, setItemType] = useState<"SURCHARGE" | "PRODUCT">("SURCHARGE");
  const [selectedParentService, setSelectedParentService] = useState(
    availableServices[0] || "Serviço Principal"
  );
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");

  // Descontos
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [discountValue, setDiscountValue] = useState<string>("0");
  const [discountReason, setDiscountReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleAddExtra() {
    const amountNum = parseFloat(newAmount);
    if (!amountNum || amountNum <= 0) return;

    if (itemType === "SURCHARGE") {
      const description = newDesc.trim()
        ? `Taxa Adicional (${newDesc.trim()})`
        : `Taxa Adicional`;
      setAdditionalItems((prev) => [
        ...prev,
        {
          description,
          amount: amountNum,
          category: "SURCHARGE",
          parentServiceName: selectedParentService,
        },
      ]);
    } else {
      if (!newDesc.trim()) return;
      setAdditionalItems((prev) => [
        ...prev,
        {
          description: newDesc.trim(),
          amount: amountNum,
          category: "PRODUCT",
        },
      ]);
    }

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
        discountReason: discountReason.trim() || (discountCalculated > 0 ? "Ajuste comercial" : undefined),
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
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Concluir Atendimento & Comanda</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Lance taxas adicionais por complexidade, produtos de balcão ou descontos.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 1. Adicionar Taxas Adicionais ou Produtos de Balcão */}
        <div className="space-y-3 bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-extrabold text-stone-800 uppercase tracking-wider">
              + Lançar Adicional no Atendimento
            </label>
            <div className="flex items-center gap-1 bg-stone-200/60 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setItemType("SURCHARGE")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  itemType === "SURCHARGE"
                    ? "bg-white text-violet-700 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Taxa de Serviço
              </button>
              <button
                type="button"
                onClick={() => setItemType("PRODUCT")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  itemType === "PRODUCT"
                    ? "bg-white text-violet-700 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Produto / Bebida
              </button>
            </div>
          </div>

          {itemType === "SURCHARGE" ? (
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-stone-500 mb-1">
                  Vincular taxa ao serviço:
                </label>
                <select
                  value={selectedParentService}
                  onChange={(e) => setSelectedParentService(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold text-stone-800"
                >
                  {availableServices.length > 0 ? (
                    availableServices.map((s, idx) => (
                      <option key={idx} value={s}>
                        {s}
                      </option>
                    ))
                  ) : (
                    <option value="Serviço Principal">Serviço Principal</option>
                  )}
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  placeholder="Motivo (ex: Incrustação pesada, Louça acumulada)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="number"
                  placeholder="R$ Valor"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-24 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={handleAddExtra}
                  className="bg-violet-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-violet-700 transition-colors shrink-0 cursor-pointer"
                >
                  + Adicionar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                placeholder="Nome do produto (ex: Cerveja Heineken, Pomada Matte)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="number"
                placeholder="R$ Valor"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-24 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={handleAddExtra}
                className="bg-stone-900 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors shrink-0 cursor-pointer"
              >
                + Adicionar
              </button>
            </div>
          )}

          {/* Lista de itens adicionados */}
          {additionalItems.length > 0 && (
            <ul className="space-y-1.5 pt-2">
              {additionalItems.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between text-xs bg-white rounded-xl p-2.5 border border-stone-200/90 shadow-xs"
                >
                  <div>
                    <span className="font-bold text-stone-900 block">{item.description}</span>
                    {item.parentServiceName && (
                      <span className="text-[10px] text-violet-600 font-semibold">
                        ↳ Vinculado a: {item.parentServiceName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-stone-900">
                      + {currency} {item.amount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtra(idx)}
                      className="text-red-500 hover:text-red-700 font-bold text-xs p-1 cursor-pointer"
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
          <label className="block text-xs font-extrabold text-stone-800 uppercase tracking-wider">
            - Aplicar Desconto / Cortesia
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Tipo de Desconto</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium"
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
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 font-bold"
              />
            </div>
          </div>
          {numericDiscountVal > 0 && (
            <div>
              <label className="block text-[11px] text-stone-500 mb-1">Motivo do Desconto (aparecerá no recibo)</label>
              <input
                placeholder="Ex: Cortesia por atraso, Desconto comercial de fidelidade"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          )}
        </div>

        {/* 3. Resumo Financeiro do Fechamento */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Valor Base do Agendamento:</span>
            <span className="font-semibold">{currency} {originalTotal.toFixed(2)}</span>
          </div>

          {additionalsTotal > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>+ Adicionais & Taxas:</span>
              <span className="font-bold">+ {currency} {additionalsTotal.toFixed(2)}</span>
            </div>
          )}

          {discountCalculated > 0 && (
            <div className="flex justify-between text-red-600">
              <span>- Desconto Aplicado:</span>
              <span className="font-bold">- {currency} {discountCalculated.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-stone-200 pt-2 flex justify-between items-center text-sm font-bold text-stone-900">
            <span>Total Final da Comanda:</span>
            <span className="text-base font-black text-emerald-600">
              {currency} {finalTotal.toFixed(2)}
            </span>
          </div>

          {difference !== 0 && (
            <p className={`text-[11px] pt-1 font-semibold ${difference > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              {difference > 0
                ? `⚡ Cobrança adicional no local de: ${currency} ${difference.toFixed(2)}`
                : `🔄 Estorno automático no cartão de: ${currency} ${Math.abs(difference).toFixed(2)}`}
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Botoes de Ação */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isPending}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isPending}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <span>{isSubmitting || isPending ? "Processando..." : "Concluir & Gerar Fatura"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
