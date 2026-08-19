import React from "react";
import { notFound } from "next/navigation";
import { getBookingCheckinInfoAction } from "@/server/actions/checkin";
import { CheckinClient } from "./checkin-client";

export const metadata = {
  title: "Check-in Inteligente | Kreator Booking",
  description: "Valide sua chegada na recepção com validação de horário e proximidade geográfica.",
};

type Props = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ t?: string; exp?: string }>;
};

export default async function CheckinPage({ params, searchParams }: Props) {
  const { bookingId } = await params;
  const { t: token, exp: expStr } = await searchParams;

  const expTimestamp = expStr ? parseInt(expStr, 10) : undefined;

  const result = await getBookingCheckinInfoAction(bookingId, token, expTimestamp);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-muted)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--color-bg)] rounded-[var(--radius-panel)] p-8 border border-[var(--color-border)] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-[var(--radius-card)] bg-[var(--color-danger-light)] text-[var(--color-danger)] flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠️
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text-heading)]">Agendamento Não Localizado</h1>
          <p className="text-xs text-[var(--color-text-muted)] font-medium">
            {result.error || "O link de check-in é inválido ou já expirou. Apresente-se diretamente na recepção do estabelecimento."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <CheckinClient
      booking={result.data}
      token={token}
      expTimestamp={expTimestamp}
    />
  );
}
