import React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { KreatorLogo } from "@/components/ui/kreator-logo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { generateIcsToken } from "@/lib/ics";
import { ReturnAnchorCard } from "@/components/ui/return-anchor-card";

export const metadata = {
  title: "Agendamento Confirmado — Obrigado!",
  description: "Seu agendamento foi realizado com sucesso. Confira os detalhes e salve no seu calendário.",
};

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{
    booking?: string;
    bookingId?: string;
    slug?: string;
  }>;
}) {
  const params = await searchParams;
  const targetBookingId = params.booking || params.bookingId;

  let booking: any = null;

  if (targetBookingId) {
    booking = await db.booking.findUnique({
      where: { id: targetBookingId },
      include: {
        company: true,
        bookingConfig: true,
        customerDetail: true,
        estimate: {
          include: {
            serviceTypes: {
              include: { serviceType: { select: { name: true } } },
            },
            extraServices: {
              include: { extraService: { select: { name: true } } },
            },
          },
        },
        professional: { select: { name: true } },
      },
    });
  }

  const company = booking?.company;
  const customer = booking?.customerDetail;
  const formattedDate = booking?.scheduledDate
    ? booking.scheduledDate.split("-").reverse().join("/")
    : null;

  // Calendars — o token é HMAC do bookingId e a rota real é /api/ics/[bookingId]
  const icsToken = booking ? generateIcsToken(booking.id) : null;
  const icsUrl = booking ? `/api/ics/${booking.id}?token=${icsToken}` : "#";

  let googleCalendarUrl = "";
  if (booking && company) {
    const title = encodeURIComponent(`Agendamento - ${company.name}`);
    const details = encodeURIComponent(
      `Agendamento confirmado com ${company.name}.\nCliente: ${customer?.name || ""}\nTelefone: ${company.phone || ""}`
    );
    const location = encodeURIComponent(company.address || "");
    googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
  }

  const whatsappPhone = company?.phone?.replace(/\D/g, "") || "";
  const whatsappConfirmUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Olá ${company?.name}! Acabei de agendar meu atendimento (Código: #${booking?.id.slice(-6).toUpperCase() || ""}). Confirmando por aqui!`)}`
    : null;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[var(--color-text-heading)] flex flex-col justify-between selection:bg-[var(--color-navy)] selection:text-white font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg)] backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Kreator Início">
            <KreatorLogo size={28} textClassName="font-semibold text-[var(--color-text-heading)] text-base" />
          </Link>
          {company && (
            <Link
              href={`/book/${company.slug}`}
              className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] px-3 py-1.5 rounded-full hover:bg-[var(--color-bg-muted)] transition-colors border border-[var(--color-border)]"
            >
              ← Voltar para {company.name}
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl w-full mx-auto px-4 py-10 space-y-6 my-auto">
        <Breadcrumbs
          items={[
            { name: "Início", url: "/" },
            ...(company ? [{ name: company.name, url: `/book/${company.slug}` }] : []),
            { name: "Confirmação & Obrigado", url: "/obrigado" },
          ]}
        />

        {/* Success Hero Card */}
        <div className="card-tactile rounded-[var(--radius-panel)] p-8 sm:p-10 text-center space-y-6 bg-[var(--color-bg)] border border-[var(--color-border)] shadow-xs">
          {/* Animated check badge with spring feeling */}
          <div className="w-16 h-16 bg-[var(--color-success-light)] text-[var(--color-success)] rounded-full flex items-center justify-center mx-auto text-3xl font-semibold shadow-xs">
            ✓
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--color-success-light)] text-[var(--color-success)] text-xs font-bold rounded-full border border-[var(--color-success-border)]">
              ● Agendamento Confirmado com Sucesso
            </span>
            <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-[var(--color-text-heading)]">
              Tudo pronto! <span className="font-serif italic font-normal text-[var(--color-success)]">Obrigado pela sua preferência.</span>
            </h1>
            <p className="text-[var(--color-text-muted)] text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-medium">
              Enviamos os detalhes da sua reserva e lembretes para o seu WhatsApp e e-mail.
            </p>
          </div>

          {/* Booking Summary Box (if booking found) */}
          {booking && (
            <div className="bg-[var(--color-bg-subtle)] rounded-[var(--radius-card)] p-6 border border-[var(--color-border)] text-left space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <span className="text-[var(--text-2xs)] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider block">
                    Estabelecimento
                  </span>
                  <p className="text-base font-semibold text-[var(--color-text-heading)]">{company.name}</p>
                </div>
                <span className="text-xs font-mono text-[var(--color-text)] font-bold bg-[var(--color-bg)] px-2.5 py-1 rounded-[var(--radius-control)] border border-[var(--color-border)] shadow-2xs">
                  #{booking.id.slice(-8).toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-[var(--color-text-muted)] block text-[var(--text-2xs)] font-bold">Data & Horário:</span>
                  <span className="font-semibold text-[var(--color-text-heading)]">
                    📅 {formattedDate} às {booking.startTime}
                  </span>
                </div>

                {customer && (
                  <div>
                    <span className="text-[var(--color-text-muted)] block text-[var(--text-2xs)] font-bold">Cliente:</span>
                    <span className="font-bold text-[var(--color-text-heading)] truncate block">
                      👤 {customer.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Services List */}
              {booking.estimate?.serviceTypes && (
                <div className="pt-2 border-t border-[var(--color-border)]">
                  <span className="text-[var(--color-text-muted)] block text-[var(--text-2xs)] font-bold mb-1">Serviço:</span>
                  {booking.estimate.serviceTypes.map((st: any, i: number) => (
                    <p key={i} className="font-bold text-[var(--color-text)] text-xs">
                      • {st.serviceType?.name}
                    </p>
                  ))}
                  {booking.estimate.extraServices?.map((ex: any, i: number) => (
                    <p key={i} className="font-medium text-[var(--color-primary)] text-xs">
                      + Extra: {ex.extraService?.name}
                    </p>
                  ))}
                </div>
              )}

              {/* Location */}
              {company.address && (
                <div className="pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                  <span className="shrink-0">📍</span>
                  <span>{company.address}</span>
                </div>
              )}
            </div>
          )}

          {/* Next Steps / O que acontece agora */}
          <div className="text-left space-y-3 pt-4 border-t border-[var(--color-border)]">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              O que acontece agora?
            </h4>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
                <span className="font-bold text-[var(--color-text-heading)] block mb-1">1. Lembrete WhatsApp</span>
                <p className="text-[var(--color-text-muted)] text-[var(--text-2xs)]">Você receberá um lembrete automático antes do horário.</p>
              </div>
              <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
                <span className="font-bold text-[var(--color-text-heading)] block mb-1">2. Atendimento Pontual</span>
                <p className="text-[var(--color-text-muted)] text-[var(--text-2xs)]">Sua vaga e equipe estarão 100% reservadas para você.</p>
              </div>
              <div className="p-3.5 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
                <span className="font-bold text-[var(--color-text-heading)] block mb-1">3. Avaliação VIP</span>
                <p className="text-[var(--color-text-muted)] text-[var(--text-2xs)]">Após o serviço, você pode avaliar seu atendimento.</p>
              </div>
            </div>
          </div>

          {/* Smart Geofenced Check-in Notice */}
          {booking && (
            <div className="bg-[var(--color-success-light)] border border-[var(--color-success-border)] rounded-[var(--radius-card)] p-4 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-success)]">
                  <span>📍 Check-in Inteligente por Proximidade</span>
                  <span className="text-[var(--text-2xs)] bg-[var(--color-success-light)] text-[var(--color-success)] px-2 py-0.5 rounded-full font-semibold">Novo</span>
                </div>
                <p className="text-[var(--text-2xs)] text-[var(--color-success)] font-medium">
                  No dia do atendimento (15 min antes), valide sua chegada na recepção com 1 clique pelo celular.
                </p>
              </div>
              <Link
                href={`/checkin/${booking.id}`}
                className="btn-tactile px-3.5 py-2 bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white rounded-[var(--radius-control)] text-xs font-bold shrink-0 shadow-2xs inline-flex items-center gap-1.5"
              >
                <span>Acessar Check-in ➔</span>
              </Link>
            </div>
          )}

          {/* ── Dynamic Return Anchor: Garantia de Reagendamento ── */}
          {booking && (
            <ReturnAnchorCard
              serviceName={booking.estimate?.serviceTypes?.[0]?.serviceType?.name || "Corte"}
              professionalName={booking.professional?.name}
              companySlug={company.slug}
            />
          )}

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {googleCalendarUrl && (
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius-card)] bg-[var(--color-navy)] text-white font-bold text-xs shadow-xs hover:bg-[var(--color-navy)]"
              >
                <span>📅 Adicionar ao Google Agenda</span>
              </a>
            )}

            {icsToken && (
              <a
                href={icsUrl}
                download="agendamento.ics"
                className="btn-tactile flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] border border-[var(--color-border)] text-[var(--color-text)] font-bold text-xs hover:bg-[var(--color-bg-muted)]"
              >
                <span>🍏 Salvar no Apple / iCal</span>
              </a>
            )}
          </div>

          {/* Secondary Actions: WhatsApp confirmation & Receipt */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold pt-2">
            {whatsappConfirmUrl && (
              <a
                href={whatsappConfirmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-success)] hover:text-[var(--color-success)] flex items-center gap-1.5 hover:underline"
              >
                <span>📱 Falar com a Empresa no WhatsApp</span>
              </a>
            )}

            {booking && (
              <Link
                href={`/receipt/${booking.id}`}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] flex items-center gap-1.5 hover:underline"
              >
                <span>🧾 Ver Comprovante / Recibo</span>
              </Link>
            )}

            <Link href="/" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline">
              Página Inicial
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-muted)] py-6 text-center text-xs text-[var(--color-text-muted)]">
        <p>© {new Date().getFullYear()} Kreator. Agendamentos e Gestão Inteligente.</p>
      </footer>
    </div>
  );
}
