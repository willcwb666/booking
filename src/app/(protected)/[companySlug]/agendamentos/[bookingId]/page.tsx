import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getBookingDetail, getSeriesSummary } from "@/server/queries/bookings";
import { todayInTimezone } from "@/lib/company-date";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CancelDialog } from "./_components/cancel-dialog";
import { StatusActions } from "./_components/status-actions";
import { RescheduleDialog } from "./_components/reschedule-dialog";
import { RefundButton } from "./_components/refund-button";
import { MarkPaidButton } from "./_components/mark-paid-button";
import { SeriesCard } from "./_components/series-card";
import { formatMoney } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  RESCHEDULED: "Reagendado",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
  CONFIRMED: "bg-[var(--color-info-light)] text-[var(--color-info)]",
  IN_PROGRESS: "bg-[var(--color-primary-light)] text-[var(--color-primary)]",
  COMPLETED: "bg-[var(--color-success-light)] text-[var(--color-success)]",
  CANCELLED: "bg-[var(--color-danger-light)] text-[var(--color-danger)]",
  RESCHEDULED: "bg-[var(--color-warning-light)] text-[var(--color-warning)]",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Reembolsado",
};

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ companySlug: string; bookingId: string }>;
}) {
  const { companySlug, bookingId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const booking = await getBookingDetail(company.id, bookingId);
  if (!booking) notFound();

  const { customerDetail: customer, homeAccess, estimate } = booking;

  /**
   * A série de que este agendamento faz parte.
   *
   * `recurrenceGroupId` era gravado e nunca lido: a série existia no banco e
   * era invisível na tela.
   */
  const series = booking.recurrenceGroupId
    ? await getSeriesSummary({
        companyId: company.id,
        groupId: booking.recurrenceGroupId,
        today: todayInTimezone(company.timezone),
      })
    : null;
  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const canReschedule = booking.status === "CONFIRMED" || booking.status === "PENDING";
  const canRefund = booking.paymentMethod === "CARD" && booking.paymentStatus === "PAID";
  const canMarkPaid =
    booking.paymentStatus === "PENDING" && booking.status !== "CANCELLED";
  const reviewUrl = `/book/${companySlug}/review/${bookingId}`;

  const availableServices = Array.from(
    new Set([
      booking.bookingConfig.name,
      ...(booking.estimate?.serviceTypes?.map((st) => st.serviceType.name) ?? []),
      ...(booking.estimate?.extraServices?.map((ex) => ex.extraService.name) ?? []),
    ])
  ).filter(Boolean) as string[];

  const todayStr = new Date().toISOString().split("T")[0];
  const isFuture = booking.scheduledDate > todayStr;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          href={`/${companySlug}/agendamentos`}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center gap-1 mb-3"
        >
          ‹ Agendamentos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-heading)]">
              {customer ? `${customer.firstName} ${customer.lastName}` : "Agendamento"}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              {booking.scheduledDate.split("-").reverse().join("/")} às{" "}
              {booking.scheduledStartTime} – {booking.scheduledEndTime}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[booking.status] ?? "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"}`}
            >
              {STATUS_LABELS[booking.status] ?? booking.status}
            </span>
            <StatusActions
              bookingId={bookingId}
              companySlug={companySlug}
              currentStatus={booking.status}
              originalTotal={Number(booking.estimate?.total ?? 0)}
              currency={company.currency}
              availableServices={availableServices}
              isFuture={isFuture}
            />
            {canReschedule && (
              <RescheduleDialog
                bookingId={bookingId}
                companySlug={companySlug}
                agendaId={booking.agendaId}
              />
            )}
            {canCancel && (
              <CancelDialog
                bookingId={bookingId}
                companySlug={companySlug}
              />
            )}
            {canRefund && (
              <RefundButton bookingId={bookingId} companySlug={companySlug} />
            )}
            {canMarkPaid && (
              <MarkPaidButton bookingId={bookingId} companySlug={companySlug} />
            )}
            {booking.status === "COMPLETED" && (
              <a
                href={`/receipt/${bookingId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-[var(--radius-control)] bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)] transition-colors shadow-sm"
              >
                <span>📄</span>
                <span>Ver / Imprimir Comprovante PDF</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {series && (
        <SeriesCard companySlug={companySlug} bookingId={bookingId} series={series} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Booking info */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">Detalhes do agendamento</h2>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-text-muted)]">Config. Booking</dt>
              <dd className="font-medium text-[var(--color-text-heading)]">{booking.bookingConfig.name}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-text-muted)]">Data</dt>
              <dd className="font-medium text-[var(--color-text-heading)]">
                {booking.scheduledDate.split("-").reverse().join("/")}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-text-muted)]">Horário</dt>
              <dd className="font-medium text-[var(--color-text-heading)]">
                {booking.scheduledStartTime} – {booking.scheduledEndTime}
              </dd>
            </div>
            {booking.professional && (
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">Profissional</dt>
                <dd className="font-medium text-[var(--color-text-heading)]">{booking.professional.name}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-text-muted)]">Forma de pagamento</dt>
              <dd className="font-medium text-[var(--color-text-heading)]">
                {booking.companyPaymentMethod?.label ??
                  (booking.paymentMethod === "CARD"
                    ? "Cartão"
                    : booking.paymentMethod === "PIX"
                      ? "PIX"
                      : "Dinheiro / Cheque")}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-text-muted)]">Status pagamento</dt>
              <dd className="font-medium text-[var(--color-text-heading)]">
                {PAYMENT_STATUS_LABELS[booking.paymentStatus] ?? booking.paymentStatus}
              </dd>
            </div>
            {booking.paidAt && (
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">Pago em</dt>
                <dd className="font-medium text-[var(--color-text-heading)]">
                  {new Date(booking.paidAt).toLocaleString("pt-BR")}
                  {booking.paymentConfirmedBy && (
                    <span className="text-[var(--color-text-subtle)] font-normal">
                      {" "}· {booking.paymentConfirmedBy.name}
                    </span>
                  )}
                </dd>
              </div>
            )}
            {booking.stripePaymentIntentId && (
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">Payment Intent</dt>
                <dd className="font-mono text-xs text-[var(--color-text-muted)] break-all">
                  {booking.stripePaymentIntentId}
                </dd>
              </div>
            )}
            {booking.status === "CANCELLED" && (
              <>
                <div className="flex justify-between text-sm">
                  <dt className="text-[var(--color-text-muted)]">Cancelado em</dt>
                  <dd className="font-medium text-[var(--color-text-heading)]">
                    {booking.cancelledAt
                      ? new Date(booking.cancelledAt).toLocaleString("pt-BR")
                      : "—"}
                  </dd>
                </div>
                {booking.cancelledBy && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-[var(--color-text-muted)]">Cancelado por</dt>
                    <dd className="font-medium text-[var(--color-text-heading)]">{booking.cancelledBy.name}</dd>
                  </div>
                )}
                {booking.cancellationReason && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-[var(--color-text-muted)]">Motivo</dt>
                    <dd className="font-medium text-[var(--color-text-heading)]">{booking.cancellationReason}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>

        {/* Customer info */}
        {customer && (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">Dados do cliente</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">Nome</dt>
                <dd className="font-medium text-[var(--color-text-heading)]">
                  {customer.firstName} {customer.lastName}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">E-mail</dt>
                <dd className="font-medium text-[var(--color-text-heading)]">{customer.email}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">Telefone</dt>
                <dd className="font-medium text-[var(--color-text-heading)]">{customer.phone}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">Endereço</dt>
                <dd className="font-medium text-[var(--color-text-heading)] text-right">
                  {customer.address}
                  {customer.aptNo ? `, ${customer.aptNo}` : ""}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">Cidade / CEP</dt>
                <dd className="font-medium text-[var(--color-text-heading)]">
                  {customer.city} — {customer.zip}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">Lembretes</dt>
                <dd className="font-medium text-[var(--color-text-heading)]">
                  {customer.sendReminders ? "Sim" : "Não"}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Services */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">Serviços</h2>
          <ul className="space-y-2 mb-3">
            {(estimate?.serviceTypes ?? []).map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]">
                  {item.serviceType.service.name} — {item.serviceType.name}
                  {item.quantity > 1 && (
                    <span className="text-[var(--color-text-subtle)] ml-1">×{item.quantity}</span>
                  )}
                </span>
                <span className="font-medium text-[var(--color-text-heading)]">
                  {formatMoney(Number(item.subtotal), company.currency, company.locale)}
                </span>
              </li>
            ))}
            {(estimate?.extraServices ?? []).map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]">{item.extraService.name}</span>
                <span className="font-medium text-[var(--color-text-heading)]">
                  {formatMoney(Number(item.subtotal), company.currency, company.locale)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--color-border)] pt-3 flex justify-between">
            <span className="text-sm font-semibold text-[var(--color-text)]">Total</span>
            <span className="text-base font-bold text-[var(--color-text-heading)]">
              {formatMoney(Number(estimate?.total ?? 0), company.currency, company.locale)}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-subtle)] mt-1">
            Frequência: {estimate?.frequency ?? "—"}
          </p>
        </div>

        {/* Review link — only for COMPLETED without review */}
        {booking.status === "COMPLETED" && !booking.review && (
          <div className="lg:col-span-2 bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-[var(--radius-control)] p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-[var(--color-warning)] font-medium">
              Serviço concluído — compartilhe o link de avaliação com o cliente.
            </p>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-4 py-2 text-sm bg-[var(--color-warning)] text-white font-semibold rounded-[var(--radius-control)] hover:bg-[var(--color-warning)] transition-colors"
            >
              Link de avaliação ↗
            </a>
          </div>
        )}
        {booking.status === "COMPLETED" && booking.review && (
          <div className="lg:col-span-2 bg-[var(--color-success-light)] border border-[var(--color-success-border)] rounded-[var(--radius-control)] p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-success)]">
                {"★".repeat(booking.review.rating)}{"☆".repeat(5 - booking.review.rating)}
                <span className="ml-2 font-normal text-[var(--color-success)]">{booking.review.reviewerName ?? "Cliente"}</span>
              </p>
              {booking.review.comment && (
                <p className="text-sm text-[var(--color-success)] mt-0.5">{booking.review.comment}</p>
              )}
            </div>
            <Link href={`/${companySlug}/avaliacoes`} className="text-xs text-[var(--color-success)] hover:underline shrink-0">
              Ver todas
            </Link>
          </div>
        )}

        {/* ── Ficha VIP de Atendimento & Preferências ── */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)]/90 p-5 sm:p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)] flex items-center gap-2">
              <span>🌟 Ficha de Atendimento VIP</span>
            </h2>
            <span className="text-[length:var(--text-2xs)] font-bold text-[var(--color-success)] bg-[var(--color-success-light)] px-2.5 py-0.5 rounded-full border border-[var(--color-success-border)]">
              Experiência VIP Ativa
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {homeAccess?.additionalNote ? (
              <div className="p-3 rounded-[var(--radius-panel)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-[var(--color-text)] font-medium">
                {homeAccess.additionalNote}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-[var(--color-text)]">
                <div className="p-2.5 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
                  <span className="text-[length:var(--text-2xs)] text-[var(--color-text-subtle)] block font-bold">Conversa:</span>
                  <span className="font-semibold text-[var(--color-text-heading)]">💬 Padrão</span>
                </div>
                <div className="p-2.5 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
                  <span className="text-[length:var(--text-2xs)] text-[var(--color-text-subtle)] block font-bold">Boas-Vindas:</span>
                  <span className="font-semibold text-[var(--color-text-heading)]">☕ Café Cortesia</span>
                </div>
                <div className="p-2.5 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
                  <span className="text-[length:var(--text-2xs)] text-[var(--color-text-subtle)] block font-bold">Cuidados:</span>
                  <span className="font-semibold text-[var(--color-text-heading)]">✨ Normal</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Home access */}
        {homeAccess && (
          <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">Acesso à propriedade</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">Tipo de acesso</dt>
                <dd className="font-medium text-[var(--color-text-heading)]">
                  {homeAccess.accessType === "someone_home"
                    ? "Alguém estará em casa"
                    : "Chaves em lugar combinado"}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">Manter chave</dt>
                <dd className="font-medium text-[var(--color-text-heading)]">
                  {homeAccess.keepKeyWithProvider ? "Sim" : "Não"}
                </dd>
              </div>
              {homeAccess.additionalNote && (
                <div className="text-sm">
                  <dt className="text-[var(--color-text-muted)] mb-1">Observações</dt>
                  <dd className="text-[var(--color-text)] bg-[var(--color-bg-subtle)] rounded-[var(--radius-control)] p-2">
                    {homeAccess.additionalNote}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
