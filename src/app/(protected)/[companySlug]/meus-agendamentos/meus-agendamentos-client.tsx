"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Calendar, Clock, Scissors, User, ExternalLink, RotateCcw, XCircle, FileText } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  companyName: string;
};

export function MeusAgendamentosClient({ companySlug, companyName }: Props) {
  // Simulador de agendamentos do cliente logado
  const [bookings, setBookings] = useState([
    {
      id: "bk-101",
      serviceName: "Corte de Cabelo & Barba Completa",
      professionalName: "Renato Silva",
      date: "2026-07-28",
      time: "10:30",
      status: "CONFIRMED",
      price: 85.0,
      paymentKind: "STRIPE_CARD",
      paymentStatus: "PAID",
    },
    {
      id: "bk-102",
      serviceName: "Manicure & Pedicure Spa",
      professionalName: "Maria Oliveira",
      date: "2026-07-15",
      time: "14:00",
      status: "COMPLETED",
      price: 65.0,
      paymentKind: "MERCADOPAGO_PIX",
      paymentStatus: "PAID",
    },
  ]);

  return (
    <div className="page-content space-y-6">
      <PageHeader
        title="Meus Agendamentos"
        description={`Gerencie suas reservas ativas, reagende horários ou baixe comprovantes em ${companyName}.`}
      />

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Minhas Reservas Ativas & Histórico</span>
          </h2>

          <Link
            href={`/book/${companySlug}/default`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
          >
            <span>Novo Agendamento</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {bookings.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-6 h-6" />}
            title="Nenhum agendamento encontrado"
            description="Você ainda não realizou nenhum agendamento nesta empresa."
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold border border-indigo-100">
                      <Scissors className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{b.serviceName}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Profissional: {b.professionalName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {b.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {b.time}
                    </span>
                    <span className="font-extrabold text-emerald-700">
                      R$ {b.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge
                    variant={b.status === "CONFIRMED" ? "success" : "neutral"}
                    showLabel
                  >
                    {b.status === "CONFIRMED" ? "Confirmado" : "Concluído"}
                  </StatusBadge>

                  {b.status === "CONFIRMED" && (
                    <>
                      <ActionTooltip label="Reagendar Horário">
                        <button
                          type="button"
                          onClick={() => alert("Reagendamento solicitado!")}
                          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all shadow-2xs inline-flex items-center justify-center cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </ActionTooltip>

                      <ActionTooltip label="Cancelar Agendamento">
                        <button
                          type="button"
                          onClick={() => alert("Cancelamento realizado!")}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs transition-all shadow-2xs inline-flex items-center justify-center cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </ActionTooltip>
                    </>
                  )}

                  <ActionTooltip label="Baixar Comprovante PDF">
                    <Link
                      href={`/receipt/${b.id}`}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all shadow-2xs inline-flex items-center justify-center"
                    >
                      <FileText className="w-4 h-4" />
                    </Link>
                  </ActionTooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
