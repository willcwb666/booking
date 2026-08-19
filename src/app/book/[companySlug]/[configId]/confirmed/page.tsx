import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { generateIcsToken } from "@/lib/ics";
import { formatMoney } from "@/lib/format";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

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
  const t = await getTranslations("confirmed");

  if (!bookingId) notFound();

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      bookingConfig: {
        include: { company: { select: { name: true, logoUrl: true, currency: true, locale: true } } },
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
      companyPaymentMethod: { select: { kind: true, label: true, handle: true, instructions: true } },
    },
  });

  if (!booking) notFound();

  const { bookingConfig: config } = booking;

  const isCardFailed = redirect_status === "failed";
  const isCardSuccess =
    redirect_status === "succeeded" || booking.paymentStatus === "PAID";
  const isCash = booking.paymentMethod === "CASH_CHECK";
  const isPix = booking.paymentMethod === "PIX";

  if (isCardFailed) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-subtle)] flex items-center justify-center p-4">
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-danger-border)] p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-[var(--color-danger-light)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--color-danger)]"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-[var(--color-text-heading)] mb-2">{t("payFailedTitle")}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            {t("payFailedText")}
          </p>
          <Link
            href={`/book/${companySlug}/${configId}/checkout?estimate=${booking.estimateId}`}
            className="inline-block py-2 px-5 bg-[var(--color-info)] text-white text-sm font-semibold rounded-[var(--radius-control)] hover:bg-[var(--color-info)] transition-colors"
          >
            {t("tryAgain")}
          </Link>
        </div>
      </div>
    );
  }

  const { customerDetail: customer } = booking;

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      {/* Header */}
      <header className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-info)] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <span className="text-white font-bold">
              {config.company.name[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-[var(--color-text-heading)]">{config.company.name}</h1>
            <p className="text-xs text-[var(--color-text-muted)]">{config.name}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Success banner */}
        <div className="bg-[var(--color-success-light)] border border-[var(--color-success-border)] rounded-[var(--radius-control)] p-6 mb-6 text-center">
          <div className="w-14 h-14 bg-[var(--color-success-light)] rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--color-success)]"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[var(--color-success)] mb-1">
            {isCash ? t("titleCash") : isPix && isCardSuccess ? t("titlePixPaid") : isPix ? t("titlePixWaiting") : isCardSuccess ? t("titleCardPaid") : t("titleReceived")}
          </h2>
          <p className="text-sm text-[var(--color-success)]">
            {isCash
              ? t("textCash")
              : isPix && isCardSuccess
              ? t("textPixPaid")
              : isPix
              ? t("textPixWaiting")
              : isCardSuccess
              ? t("textCardPaid")
              : t("textReceived")}
          </p>
        </div>

        {/* Instruções de pagamento — métodos manuais (PIX por chave, Zelle, Venmo…) */}
        {booking.companyPaymentMethod?.kind === "MANUAL" &&
          booking.paymentStatus === "PENDING" &&
          (booking.companyPaymentMethod.handle || booking.companyPaymentMethod.instructions) && (
            <div className="bg-[var(--color-info-light)] border border-[var(--color-info-border)] rounded-[var(--radius-control)] p-5 mb-4">
              <h2 className="text-sm font-semibold text-[var(--color-info)] mb-2">
                {t("howToPay", { label: booking.companyPaymentMethod.label })}
              </h2>
              {booking.companyPaymentMethod.handle && (
                <p className="text-sm font-mono font-medium text-[var(--color-info)] bg-[var(--color-bg)] border border-[var(--color-info-border)] rounded-[var(--radius-control)] px-3 py-2 mb-2 break-all">
                  {booking.companyPaymentMethod.handle}
                </p>
              )}
              <p className="text-xs text-[var(--color-info)]">
                {booking.companyPaymentMethod.instructions ?? t("afterPay")}
              </p>
            </div>
          )}

        {/* Booking details */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5 mb-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">{t("detailsTitle")}</h2>
          <dl className="space-y-3">
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-text-muted)]">{t("date")}</dt>
              <dd className="font-medium text-[var(--color-text-heading)]">
                {booking.scheduledDate.split("-").reverse().join("/")}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-text-muted)]">{t("time")}</dt>
              <dd className="font-medium text-[var(--color-text-heading)]">
                {booking.scheduledStartTime} – {booking.scheduledEndTime}
              </dd>
            </div>
            {booking.professional && (
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">{t("professional")}</dt>
                <dd className="font-medium text-[var(--color-text-heading)]">{booking.professional.name}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-[var(--color-text-muted)]">{t("payment")}</dt>
              <dd className="font-medium text-[var(--color-text-heading)]">
                {booking.companyPaymentMethod?.label ??
                  (booking.paymentMethod === "CARD" ? t("card") : booking.paymentMethod === "PIX" ? "PIX" : t("cashCheck"))}
              </dd>
            </div>
            {customer && (
              <div className="flex justify-between text-sm">
                <dt className="text-[var(--color-text-muted)]">{t("address")}</dt>
                <dd className="font-medium text-[var(--color-text-heading)] text-right">
                  {customer.address}
                  {customer.aptNo ? `, ${customer.aptNo}` : ""} — {customer.city}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Order summary */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-3">{t("servicesTitle")}</h2>
          <ul className="space-y-1.5 mb-3">
            {(booking.estimate?.serviceTypes ?? []).map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]">
                  {item.serviceType.service.name} — {item.serviceType.name}
                  {item.quantity > 1 && (
                    <span className="text-[var(--color-text-subtle)] ml-1">×{item.quantity}</span>
                  )}
                </span>
                <span className="font-medium text-[var(--color-text-heading)]">
                  {formatMoney(Number(item.subtotal), config.company.currency, config.company.locale)}
                </span>
              </li>
            ))}
            {(booking.estimate?.extraServices ?? []).map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-[var(--color-text)]">{item.extraService.name}</span>
                <span className="font-medium text-[var(--color-text-heading)]">
                  {formatMoney(Number(item.subtotal), config.company.currency, config.company.locale)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[var(--color-border)] pt-3 flex justify-between">
            <span className="text-sm font-semibold text-[var(--color-text)]">{t("total")}</span>
            <span className="text-base font-bold text-[var(--color-text-heading)]">
              {formatMoney(Number(booking.estimate?.total ?? 0), config.company.currency, config.company.locale)}
            </span>
          </div>
        </div>

        {/* Calendar download */}
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          <a
            href={`/api/ics/${bookingId}?token=${generateIcsToken(bookingId)}`}
            download
            className="text-xs text-[var(--color-info)] hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {t("addToCalendar")}
          </a>
        </div>

        <p className="text-center text-xs text-[var(--color-text-subtle)] mt-4">
          {t("questions", { name: config.company.name })}
        </p>
      </div>
    </div>
  );
}
