import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getBookingDetail } from "@/server/queries/bookings";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CancelDialog } from "./_components/cancel-dialog";
import { StatusActions } from "./_components/status-actions";
import { RescheduleDialog } from "./_components/reschedule-dialog";
import { RefundButton } from "./_components/refund-button";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  RESCHEDULED: "Reagendado",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  RESCHEDULED: "bg-orange-100 text-orange-800",
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
  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";
  const canReschedule = booking.status === "CONFIRMED" || booking.status === "PENDING";
  const canRefund = booking.paymentMethod === "CARD" && booking.paymentStatus === "PAID";
  const reviewUrl = `/book/${companySlug}/review/${bookingId}`;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          href={`/${companySlug}/agendamentos`}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3"
        >
          ‹ Agendamentos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {customer ? `${customer.firstName} ${customer.lastName}` : "Agendamento"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {booking.scheduledDate.split("-").reverse().join("/")} às{" "}
              {booking.scheduledStartTime} – {booking.scheduledEndTime}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-600"}`}
            >
              {STATUS_LABELS[booking.status] ?? booking.status}
            </span>
            <StatusActions
              bookingId={bookingId}
              companySlug={companySlug}
              currentStatus={booking.status}
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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Booking info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Detalhes do agendamento</h2>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Config. Booking</dt>
              <dd className="font-medium text-gray-900">{booking.bookingConfig.name}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Data</dt>
              <dd className="font-medium text-gray-900">
                {booking.scheduledDate.split("-").reverse().join("/")}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Horário</dt>
              <dd className="font-medium text-gray-900">
                {booking.scheduledStartTime} – {booking.scheduledEndTime}
              </dd>
            </div>
            {booking.professional && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Profissional</dt>
                <dd className="font-medium text-gray-900">{booking.professional.name}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Forma de pagamento</dt>
              <dd className="font-medium text-gray-900">
                {booking.paymentMethod === "CARD" ? "Cartão" : "Dinheiro / Cheque"}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Status pagamento</dt>
              <dd className="font-medium text-gray-900">
                {PAYMENT_STATUS_LABELS[booking.paymentStatus] ?? booking.paymentStatus}
              </dd>
            </div>
            {booking.stripePaymentIntentId && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Payment Intent</dt>
                <dd className="font-mono text-xs text-gray-500 break-all">
                  {booking.stripePaymentIntentId}
                </dd>
              </div>
            )}
            {booking.status === "CANCELLED" && (
              <>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-500">Cancelado em</dt>
                  <dd className="font-medium text-gray-900">
                    {booking.cancelledAt
                      ? new Date(booking.cancelledAt).toLocaleString("pt-BR")
                      : "—"}
                  </dd>
                </div>
                {booking.cancelledBy && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Cancelado por</dt>
                    <dd className="font-medium text-gray-900">{booking.cancelledBy.name}</dd>
                  </div>
                )}
                {booking.cancellationReason && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Motivo</dt>
                    <dd className="font-medium text-gray-900">{booking.cancellationReason}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>

        {/* Customer info */}
        {customer && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Dados do cliente</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Nome</dt>
                <dd className="font-medium text-gray-900">
                  {customer.firstName} {customer.lastName}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">E-mail</dt>
                <dd className="font-medium text-gray-900">{customer.email}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Telefone</dt>
                <dd className="font-medium text-gray-900">{customer.phone}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Endereço</dt>
                <dd className="font-medium text-gray-900 text-right">
                  {customer.address}
                  {customer.aptNo ? `, ${customer.aptNo}` : ""}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Cidade / CEP</dt>
                <dd className="font-medium text-gray-900">
                  {customer.city} — {customer.zip}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Lembretes</dt>
                <dd className="font-medium text-gray-900">
                  {customer.sendReminders ? "Sim" : "Não"}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {/* Services */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Serviços</h2>
          <ul className="space-y-2 mb-3">
            {estimate.serviceTypes.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.serviceType.service.name} — {item.serviceType.name}
                  {item.quantity > 1 && (
                    <span className="text-gray-400 ml-1">×{item.quantity}</span>
                  )}
                </span>
                <span className="font-medium text-gray-900">
                  {Number(item.subtotal).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </li>
            ))}
            {estimate.extraServices.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.extraService.name}</span>
                <span className="font-medium text-gray-900">
                  {Number(item.subtotal).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-gray-100 pt-3 flex justify-between">
            <span className="text-sm font-semibold text-gray-700">Total</span>
            <span className="text-base font-bold text-gray-900">
              {Number(estimate.total).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Frequência: {estimate.frequency}
          </p>
        </div>

        {/* Review link — only for COMPLETED without review */}
        {booking.status === "COMPLETED" && !booking.review && (
          <div className="lg:col-span-2 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-yellow-800 font-medium">
              Serviço concluído — compartilhe o link de avaliação com o cliente.
            </p>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-4 py-2 text-sm bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Link de avaliação ↗
            </a>
          </div>
        )}
        {booking.status === "COMPLETED" && booking.review && (
          <div className="lg:col-span-2 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-green-800">
                {"★".repeat(booking.review.rating)}{"☆".repeat(5 - booking.review.rating)}
                <span className="ml-2 font-normal text-green-700">{booking.review.reviewerName ?? "Cliente"}</span>
              </p>
              {booking.review.comment && (
                <p className="text-sm text-green-700 mt-0.5">{booking.review.comment}</p>
              )}
            </div>
            <Link href={`/${companySlug}/avaliacoes`} className="text-xs text-green-600 hover:underline shrink-0">
              Ver todas
            </Link>
          </div>
        )}

        {/* Home access */}
        {homeAccess && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Acesso à propriedade</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Tipo de acesso</dt>
                <dd className="font-medium text-gray-900">
                  {homeAccess.accessType === "someone_home"
                    ? "Alguém estará em casa"
                    : "Chaves em lugar combinado"}
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Manter chave</dt>
                <dd className="font-medium text-gray-900">
                  {homeAccess.keepKeyWithProvider ? "Sim" : "Não"}
                </dd>
              </div>
              {homeAccess.additionalNote && (
                <div className="text-sm">
                  <dt className="text-gray-500 mb-1">Observações</dt>
                  <dd className="text-gray-700 bg-gray-50 rounded-lg p-2">
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
