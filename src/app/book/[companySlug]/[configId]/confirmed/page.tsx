import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string; configId: string }>;
  searchParams: Promise<{
    booking?: string;
    payment_intent?: string;
    redirect_status?: string;
  }>;
}) {
  const { companySlug, configId } = await params;
  const { booking: bookingId, redirect_status } = await searchParams;

  if (!bookingId) notFound();

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      bookingConfig: {
        include: { company: { select: { name: true, logoUrl: true } } },
      },
      customerDetail: true,
      estimate: {
        include: {
          serviceTypes: {
            include: {
              serviceType: { select: { name: true, service: { select: { name: true } } } },
            },
          },
          extraServices: {
            include: { extraService: { select: { name: true } } },
          },
        },
      },
      professional: { select: { name: true } },
    },
  });

  if (!booking) notFound();

  const { bookingConfig: config } = booking;

  const isCardFailed = redirect_status === "failed";
  const isCardSuccess =
    redirect_status === "succeeded" || booking.paymentStatus === "PAID";
  const isCash = booking.paymentMethod === "CASH_CHECK";

  if (isCardFailed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-500"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Pagamento não concluído</h1>
          <p className="text-sm text-gray-600 mb-6">
            Houve um problema ao processar seu pagamento. Tente novamente.
          </p>
          <Link
            href={`/book/${companySlug}/${configId}/checkout?estimate=${booking.estimateId}`}
            className="inline-block py-2 px-5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </Link>
        </div>
      </div>
    );
  }

  const { customerDetail: customer } = booking;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <span className="text-white font-bold">
              {config.company.name[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">{config.company.name}</h1>
            <p className="text-xs text-gray-500">{config.name}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Success banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-600"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-green-900 mb-1">
            {isCash ? "Agendamento confirmado!" : isCardSuccess ? "Pagamento confirmado!" : "Agendamento recebido!"}
          </h2>
          <p className="text-sm text-green-700">
            {isCash
              ? "Seu agendamento foi confirmado. O pagamento será feito no dia do serviço."
              : isCardSuccess
              ? "Seu pagamento foi processado e o agendamento está confirmado."
              : "Recebemos seu agendamento. Aguarde a confirmação do pagamento."}
          </p>
        </div>

        {/* Booking details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Detalhes do agendamento</h2>
          <dl className="space-y-3">
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
              <dt className="text-gray-500">Pagamento</dt>
              <dd className="font-medium text-gray-900">
                {booking.paymentMethod === "CARD" ? "Cartão" : "Dinheiro / Cheque"}
              </dd>
            </div>
            {customer && (
              <div className="flex justify-between text-sm">
                <dt className="text-gray-500">Endereço</dt>
                <dd className="font-medium text-gray-900 text-right">
                  {customer.address}
                  {customer.aptNo ? `, ${customer.aptNo}` : ""} — {customer.city}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Serviços contratados</h2>
          <ul className="space-y-1.5 mb-3">
            {booking.estimate.serviceTypes.map((item) => (
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
            {booking.estimate.extraServices.map((item) => (
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
              {Number(booking.estimate.total).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Dúvidas? Entre em contato com {config.company.name}.
        </p>
      </div>
    </div>
  );
}
