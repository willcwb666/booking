"use client";

import React from "react";

type Props = {
  bookingId: string;
  companyName: string;
  totalFormatted: string;
  customerPhone?: string;
  customerName: string;
};

export function ReceiptActions({
  bookingId,
  companyName,
  totalFormatted,
  customerPhone,
  customerName,
}: Props) {
  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const text = `Olá, *${customerName}*! 🧾✨\n\nSegue o comprovante detalhado do seu atendimento na *${companyName}*:\n💰 *Total:* ${totalFormatted}\n🔗 *Visualizar Comprovante Online / PDF:* ${window.location.href}\n\nAgradecemos a preferência!`;
    const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, "") : "";
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="pt-6 border-t border-stone-200 flex flex-wrap items-center justify-center gap-3 print:hidden">
      <button
        onClick={handlePrint}
        className="bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
      >
        <span>🖨️</span>
        <span>Imprimir / Salvar em PDF</span>
      </button>

      <button
        onClick={handleSendWhatsApp}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
      >
        <span>📲</span>
        <span>Enviar no WhatsApp</span>
      </button>
    </div>
  );
}
