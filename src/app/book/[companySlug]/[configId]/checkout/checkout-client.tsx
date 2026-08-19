"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useTranslations, useLocale } from "next-intl";
import { getAvailableSlotsAction } from "@/server/actions/booking-slots";
import { createBookingAction, checkPixPaymentAction } from "@/server/actions/booking";
import type { TimeSlot } from "@/lib/agenda";
import { formatMoney } from "@/lib/format";
import { findOffPeakDiscount, type OffPeakWindow } from "@/lib/off-peak";
import { calculateDeposit } from "@/lib/pricing";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import Link from "next/link";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type AgendaConfig = {
  startDate: string;
  endDate: string | null;
  workingDays: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: number;
};

type OrderItem = { label: string; subtotal: number };

type CheckoutPaymentMethod = {
  id: string; // "" = método legado (sem registro em CompanyPaymentMethod)
  kind: "STRIPE_CARD" | "MERCADOPAGO_PIX" | "MANUAL";
  label: string;
  handle: string | null;
  instructions: string | null;
};

export type ProfessionalItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  roleTitle?: string | null;
};

type Props = {
  companySlug: string;
  configId: string;
  companyName: string;
  configName: string;
  estimateId: string;
  estimateTotal: number;
  frequency: string;
  orderItems: OrderItem[];
  agendaId: string;
  agendaConfig: AgendaConfig;
  paymentMethods: CheckoutPaymentMethod[];
  professionals?: ProfessionalItem[];
  currency: string;
  locale: string;
  businessType?: string;
  offPeakWindows?: OffPeakWindow[];
  /** Dados do perfil do usuário logado, para preencher o formulário. */
  prefill?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    aptNo: string;
    city: string;
    zip: string;
  } | null;
  requireDeposit?: boolean;
  depositPercentage?: number;
};

// Enum legado do fluxo de criação, derivado do kind
function legacyEnumFor(kind: CheckoutPaymentMethod["kind"]): string {
  if (kind === "STRIPE_CARD") return "CARD";
  if (kind === "MERCADOPAGO_PIX") return "PIX";
  return "CASH_CHECK";
}

type Step = "datetime" | "details" | "payment" | "pix";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getMonthCells(year: number, month: number) {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  // Monday-based week
  const startOffset = (firstDay.getUTCDay() + 6) % 7;
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(Date.UTC(year, month, 1 - (startOffset - i)));
    cells.push({ date: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay.getUTCDate(); d++) {
    cells.push({ date: new Date(Date.UTC(year, month, d)), isCurrentMonth: true });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({ date: new Date(Date.UTC(year, month + 1, i)), isCurrentMonth: false });
    }
  }
  return cells;
}

function isDateDisabled(dateStr: string, config: AgendaConfig): boolean {
  const today = toDateStr(new Date());
  if (dateStr < today) return true;
  if (dateStr < config.startDate) return true;
  if (config.endDate && dateStr > config.endDate) return true;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (!config.workingDays.includes(dow)) return true;
  return false;
}

// ─── Stripe payment form ──────────────────────────────────────────────────────

function StripePaymentForm({ returnUrl }: { returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations("checkout");
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (error) {
      setError(error.message ?? t("payError"));
      setPaying(false);
    }
    // On success, Stripe redirects to returnUrl
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full py-3 px-4 bg-[var(--color-info)] text-white font-semibold rounded-[var(--radius-control)] hover:bg-[var(--color-info)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {paying ? t("processing") : t("payNow")}
      </button>
    </form>
  );
}

// ─── PIX QR Code step ────────────────────────────────────────────────────────

function PixStep({
  qrCode,
  qrCodeBase64,
  bookingId,
  companySlug,
  configId,
}: {
  qrCode: string;
  qrCodeBase64: string;
  bookingId: string;
  companySlug: string;
  configId: string;
}) {
  const router = useRouter();
  const t = useTranslations("checkout");
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const attemptsRef = useRef(0);
  const MAX_ATTEMPTS = 60; // 5 minutes at 5s intervals

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      attemptsRef.current++;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        clearInterval(intervalRef.current!);
        setExpired(true);
        return;
      }
      const { paid } = await checkPixPaymentAction(bookingId);
      if (paid) {
        clearInterval(intervalRef.current!);
        router.push(`/book/${companySlug}/${configId}/confirmed?booking=${bookingId}`);
      }
    }, 5000);
    return () => clearInterval(intervalRef.current!);
  }, [bookingId, companySlug, configId, router]);

  function handleCopy() {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleManualCheck() {
    setChecking(true);
    try {
      const { paid } = await checkPixPaymentAction(bookingId);
      if (paid) {
        router.push(`/book/${companySlug}/${configId}/confirmed?booking=${bookingId}`);
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-6 text-center space-y-4">
      <h2 className="text-sm font-semibold text-[var(--color-text-heading)]">{t("pixTitle")}</h2>
      <p className="text-xs text-[var(--color-text-muted)]">{t("pixInstructions")}</p>

      {qrCodeBase64 && (
        <img
          src={`data:image/png;base64,${qrCodeBase64}`}
          alt={t("pixAlt")}
          className="w-48 h-48 mx-auto border border-[var(--color-border)] rounded-[var(--radius-control)] p-2"
        />
      )}

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={qrCode}
          className="flex-1 border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-xs text-[var(--color-text)] bg-[var(--color-bg-subtle)] truncate"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 px-3 py-2 bg-[var(--color-info)] text-white text-xs font-medium rounded-[var(--radius-control)] hover:bg-[var(--color-info)] transition-colors"
        >
          {copied ? t("copied") : t("copy")}
        </button>
      </div>

      {expired ? (
        <div className="space-y-2">
          <p className="text-xs text-[var(--color-warning)] font-medium">{t("pixExpired")}</p>
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking}
            className="px-4 py-2 bg-[var(--color-info)] text-white text-xs font-medium rounded-[var(--radius-control)] hover:bg-[var(--color-info)] disabled:opacity-50 transition-colors"
          >
            {checking ? t("checking") : t("checkPayment")}
          </button>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-subtle)]">{t("pixWaiting")}</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CheckoutClient({
  companySlug,
  configId,
  companyName,
  configName,
  estimateId,
  estimateTotal,
  frequency,
  orderItems,
  agendaId,
  agendaConfig,
  paymentMethods,
  professionals = [],
  currency,
  locale,
  businessType,
  offPeakWindows = [],
  prefill = null,
  requireDeposit,
  depositPercentage,
}: Props) {
  const router = useRouter();
  const t = useTranslations("checkout");
  const tb = useTranslations("booking");
  const uiLocale = useLocale();

  const isHomeService =
    businessType === "HOME_CLEANING" ||
    businessType === "LAWN_CARE" ||
    businessType === "POOL_CLEANING";

  // Step state
  const [step, setStep] = useState<Step>("datetime");

  // Professional state
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  // DateTime state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  /**
   * Desconto de horário ocioso do slot escolhido.
   *
   * Mesma função que o servidor usa ao criar o agendamento — se a tela
   * calculasse por conta própria, os dois números divergiriam no dia em que a
   * regra mudasse, e o cliente veria um preço e pagaria outro.
   */
  const offPeak =
    selectedDate && selectedSlot
      ? findOffPeakDiscount(offPeakWindows, selectedDate, selectedSlot.startTime, estimateTotal)
      : null;

  const [loadingSlots, startSlotTransition] = useTransition();

  // Booking state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string } | null>(null);
  const [submitting, startSubmitTransition] = useTransition();
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});
  const [selectedMethodIdx, setSelectedMethodIdx] = useState(0);

  // Membership Club State
  const [membershipCoverage, setMembershipCoverage] = useState<{
    isCovered: boolean;
    planName?: string;
    membershipId?: string;
    isUnlimited?: boolean;
    remainingSessions?: number | null;
    discountPercent?: number;
  } | null>(null);
  const [checkingMembership, setCheckingMembership] = useState(false);

  // Gift Card State
  const [giftCardInput, setGiftCardInput] = useState("");
  const [appliedGiftCard, setAppliedGiftCard] = useState<{
    code: string;
    balance: number;
    discountAmount: number;
  } | null>(null);
  const [validatingGiftCard, setValidatingGiftCard] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  /**
   * Total exibido, na MESMA ordem de `computeBookingCharge` no servidor:
   * horário ocioso → desconto de membro → vale-presente.
   *
   * Mostrar a linha do desconto sem descontar do total seria pior que não
   * mostrar nada: o cliente veria o abatimento anunciado e o mesmo valor a
   * pagar.
   */
  const afterOffPeak = Math.max(0, estimateTotal - (offPeak?.discountAmount ?? 0));
  const afterMembership = membershipCoverage?.discountPercent
    ? afterOffPeak * (1 - membershipCoverage.discountPercent / 100)
    : afterOffPeak;
  const finalTotal = Math.max(0, afterMembership - (appliedGiftCard?.discountAmount || 0));

  const formRef = useRef<HTMLFormElement>(null);

  // Calendar keyboard nav
  const calGridRef = useRef<HTMLTableSectionElement>(null);
  const [focusedDate, setFocusedDate] = useState<string | null>(null);

  async function handleApplyGiftCard() {
    if (!giftCardInput.trim()) return;
    setValidatingGiftCard(true);
    setGiftCardError(null);

    try {
      const { validateGiftCardAction } = await import("@/server/actions/gift-cards");
      const res = await validateGiftCardAction(companySlug, giftCardInput.trim());
      if (res.success && res.data) {
        const balance = res.data.currentBalance;
        const discount = Math.min(balance, estimateTotal);
        setAppliedGiftCard({
          code: res.data.code,
          balance,
          discountAmount: discount,
        });
      } else {
        setGiftCardError(res.error || "Vale-presente inválido");
      }
    } catch {
      setGiftCardError("Erro ao validar vale-presente");
    } finally {
      setValidatingGiftCard(false);
    }
  }

  function handleRemoveGiftCard() {
    setAppliedGiftCard(null);
    setGiftCardInput("");
    setGiftCardError(null);
  }

  async function handleEmailCheck(emailStr: string) {
    const email = emailStr.trim();
    if (!email || !email.includes("@")) return;

    setCheckingMembership(true);
    try {
      const { checkCustomerMembershipCoverageAction } = await import("@/server/actions/memberships");
      const res = await checkCustomerMembershipCoverageAction(companySlug, email, configId);
      if (res.success && res.data) {
        setMembershipCoverage(res.data);
      }
    } catch {
      // ignora
    } finally {
      setCheckingMembership(false);
    }
  }

  function handleDateSelect(dateStr: string, profId: string | null = selectedProfessionalId) {
    if (isDateDisabled(dateStr, agendaConfig)) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setAvailableSlots([]);
    startSlotTransition(async () => {
      const slots = await getAvailableSlotsAction(agendaId, dateStr, profId);
      setAvailableSlots(slots);
    });
  }

  function handleProfessionalSelect(profId: string | null) {
    setSelectedProfessionalId(profId);
    if (selectedDate) {
      handleDateSelect(selectedDate, profId);
    }
  }

  const handleCalKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, dateStr: string) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      let next: Date | null = null;
      if (e.key === "ArrowRight") next = new Date(Date.UTC(y, m - 1, d + 1));
      else if (e.key === "ArrowLeft") next = new Date(Date.UTC(y, m - 1, d - 1));
      else if (e.key === "ArrowDown") next = new Date(Date.UTC(y, m - 1, d + 7));
      else if (e.key === "ArrowUp") next = new Date(Date.UTC(y, m - 1, d - 7));
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleDateSelect(dateStr);
        return;
      }
      if (next) {
        e.preventDefault();
        const nextStr = toDateStr(next);
        setFocusedDate(nextStr);
        setCalYear(next.getUTCFullYear());
        setCalMonth(next.getUTCMonth());
        setTimeout(() => {
          const btn = calGridRef.current?.querySelector<HTMLButtonElement>(
            `[data-cal="${nextStr}"]`
          );
          btn?.focus();
        }, 50);
      }
    },
    [agendaConfig]
  );

  const cells = getMonthCells(calYear, calMonth);
  const todayStr = toDateStr(today);
  // Nomes de dias/meses no idioma do visitante (2024-01-01 é segunda-feira)
  const DAY_ABBREVS = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(uiLocale, { weekday: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2024, 0, 1 + i))
    )
  );
  const monthTitle = new Intl.DateTimeFormat(uiLocale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(calYear, calMonth, 1))
  );

  function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) {
      setFormErrors({ _: [t("selectDateTime")] });
      return;
    }
    setFormErrors({});
    setStep("details");
  }

  function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const method = paymentMethods[selectedMethodIdx];
    if (!method) {
      setFormErrors({ _: [t("choosePaymentError")] });
      return;
    }
    const fd = new FormData(formRef.current);
    fd.set("estimateId", estimateId);
    fd.set("agendaId", agendaId);
    fd.set("scheduledDate", selectedDate!);
    fd.set("scheduledStartTime", selectedSlot!.startTime);
    fd.set("scheduledEndTime", selectedSlot!.endTime);
    fd.set("companyPaymentMethodId", method.id);
    fd.set("paymentMethod", legacyEnumFor(method.kind));

    if (selectedProfessionalId) {
      fd.set("professionalId", selectedProfessionalId);
    }

    startSubmitTransition(async () => {
      const result = await createBookingAction(fd);
      if (!result.success) {
        setFormErrors(result.errors);
        return;
      }
      setBookingId(result.bookingId);
      if (result.paymentMethod === "CASH_CHECK") {
        router.push(`/book/${companySlug}/${configId}/confirmed?booking=${result.bookingId}`);
        return;
      }
      if (result.paymentMethod === "PIX") {
        setPixData({ qrCode: result.pixQrCode, qrCodeBase64: result.pixQrCodeBase64 });
        setStep("pix");
        return;
      }
      setStripeClientSecret(result.clientSecret);
      setStep("payment");
    });
  }

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${companySlug}/${configId}/confirmed?booking=${bookingId}`;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      {/* Header */}
      <header className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-info)] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <span className="text-white font-bold">{companyName[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-[var(--color-text-heading)]">{companyName}</h1>
            <p className="text-xs text-[var(--color-text-muted)]">{configName}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Step indicator */}
        <nav aria-label={t("stepsAria")} className="mb-8">
          <ol className="flex items-center gap-2 text-sm">
            <li className="text-[var(--color-text-subtle)] line-through">
              <Link href={`/book/${companySlug}/${configId}`}>{t("stepServices")}</Link>
            </li>
            <li className="text-[var(--color-text-subtle)]" aria-hidden="true">›</li>
            <li
              className={step === "datetime" ? "font-semibold text-[var(--color-info)]" : "text-[var(--color-text-subtle)]"}
              aria-current={step === "datetime" ? "step" : undefined}
            >
              {t("stepDatetime")}
            </li>
            <li className="text-[var(--color-text-subtle)]" aria-hidden="true">›</li>
            <li
              className={step === "details" ? "font-semibold text-[var(--color-info)]" : "text-[var(--color-text-subtle)]"}
              aria-current={step === "details" ? "step" : undefined}
            >
              {t("stepDetails")}
            </li>
            <li className="text-[var(--color-text-subtle)]" aria-hidden="true">›</li>
            <li
              className={step === "payment" ? "font-semibold text-[var(--color-info)]" : "text-[var(--color-text-subtle)]"}
              aria-current={step === "payment" ? "step" : undefined}
            >
              {t("stepPayment")}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">

            {/* ── Step: datetime ── */}
            {step === "datetime" && (
              <form onSubmit={handleSubmitDetails}>
                {/* Seletor de Profissional */}
                {professionals.length > 0 && (
                  <div className="bg-[var(--color-bg)] rounded-[var(--radius-card)] border border-[var(--color-border)] p-5 mb-4 shadow-xs">
                    <div className="mb-3">
                      <h2 className="text-sm font-bold text-[var(--color-text-heading)]">
                        Escolha o Profissional
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Selecione seu profissional de preferência ou deixe com qualquer disponível.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Qualquer Profissional */}
                      <button
                        type="button"
                        onClick={() => handleProfessionalSelect(null)}
                        className={`p-3 rounded-[var(--radius-control)] border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          selectedProfessionalId === null
                            ? "border-[var(--color-info-border)] bg-[var(--color-info-light)] ring-2 ring-[var(--color-info)]"
                            : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg)]"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--color-info-light)] text-[var(--color-info)] flex items-center justify-center font-bold text-sm shrink-0">
                          ✨
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--color-text-heading)]">Qualquer Profissional</p>
                          <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)]">Primeiro horário livre</p>
                        </div>
                      </button>

                      {/* Profissionais Específicos */}
                      {professionals.map((prof) => (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => handleProfessionalSelect(prof.id)}
                          className={`p-3 rounded-[var(--radius-control)] border text-left flex items-center gap-3 transition-all cursor-pointer ${
                            selectedProfessionalId === prof.id
                              ? "border-[var(--color-info-border)] bg-[var(--color-info-light)] ring-2 ring-[var(--color-info)]"
                              : "border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-bg)]"
                          }`}
                        >
                          {prof.avatarUrl ? (
                            <img
                              src={prof.avatarUrl}
                              alt={prof.name}
                              className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--color-border)]"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text)] flex items-center justify-center font-bold text-xs shrink-0 uppercase border border-[var(--color-border)]">
                              {prof.name.slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--color-text-heading)] truncate">{prof.name}</p>
                            <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)] truncate">
                              {prof.roleTitle || "Profissional"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calendar */}
                <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                        else setCalMonth(m => m - 1);
                      }}
                      className="p-1.5 rounded hover:bg-[var(--color-bg-muted)]"
                      aria-label={t("prevMonth")}
                    >
                      ‹
                    </button>
                    <h2 className="text-sm font-semibold text-[var(--color-text-heading)] capitalize">
                      {monthTitle}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                        else setCalMonth(m => m + 1);
                      }}
                      className="p-1.5 rounded hover:bg-[var(--color-bg-muted)]"
                      aria-label={t("nextMonth")}
                    >
                      ›
                    </button>
                  </div>
                  <table role="grid" className="w-full table-fixed text-center">
                    <thead>
                      <tr role="row">
                        {DAY_ABBREVS.map((abbr) => (
                          <th
                            key={abbr}
                            scope="col"
                            className="text-xs text-[var(--color-text-subtle)] font-medium pb-2"
                          >
                            {abbr}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody role="rowgroup" ref={calGridRef}>
                      {Array.from({ length: cells.length / 7 }, (_, ri) => (
                        <tr key={ri} role="row">
                          {cells.slice(ri * 7, ri * 7 + 7).map(({ date, isCurrentMonth }) => {
                            const ds = toDateStr(date);
                            const disabled = isDateDisabled(ds, agendaConfig);
                            const isSelected = ds === selectedDate;
                            const isToday = ds === todayStr;
                            const isFocused = ds === focusedDate;
                            return (
                              <td key={ds} role="gridcell" aria-selected={isSelected}>
                                <button
                                  type="button"
                                  data-cal={ds}
                                  tabIndex={isFocused || (!focusedDate && isSelected) || (!focusedDate && !selectedDate && isToday) ? 0 : -1}
                                  disabled={disabled}
                                  onClick={() => handleDateSelect(ds)}
                                  onKeyDown={(e) => handleCalKeyDown(e, ds)}
                                  aria-current={isToday ? "date" : undefined}
                                  aria-label={`${ds}${isSelected ? ", selecionado" : ""}${isToday ? ", hoje" : ""}`}
                                  className={[
                                    "w-8 h-8 mx-auto rounded-full text-xs font-medium transition-colors",
                                    !isCurrentMonth ? "text-[var(--color-text-subtle)]" : "",
                                    disabled ? "cursor-not-allowed opacity-40" : "hover:bg-[var(--color-info-light)]",
                                    isSelected ? "bg-[var(--color-info)] text-white hover:bg-[var(--color-info)]" : "",
                                    isToday && !isSelected ? "border border-[var(--color-info-border)] text-[var(--color-info)]" : "",
                                    !isSelected && !isToday && isCurrentMonth ? "text-[var(--color-text)]" : "",
                                  ].join(" ")}
                                >
                                  {date.getUTCDate()}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5 mb-4">
                    <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-3">
                      {t("slotsTitle", { date: selectedDate.split("-").reverse().join("/") })}
                    </h2>
                    {loadingSlots ? (
                      <p className="text-sm text-[var(--color-text-muted)]">{t("loadingSlots")}</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {t("noSlots")}
                      </p>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedSlot(availableSlots[0])}
                          className="text-xs text-[var(--color-info)] hover:underline mb-3 block"
                        >
                          {t("firstAvailable")}
                        </button>
                        <div
                          className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                          role="group"
                          aria-label={t("slotsTitle", { date: selectedDate.split("-").reverse().join("/") })}
                        >
                          {availableSlots.map((slot) => {
                            const isSelected =
                              selectedSlot?.startTime === slot.startTime;
                            return (
                              <button
                                key={slot.startTime}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                aria-pressed={isSelected}
                                className={[
                                  "py-2 px-3 rounded-[var(--radius-control)] text-sm font-medium border transition-colors",
                                  isSelected
                                    ? "bg-[var(--color-info)] text-white border-[var(--color-info-border)]"
                                    : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-info-border)] hover:bg-[var(--color-info-light)]",
                                ].join(" ")}
                              >
                                {slot.startTime}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {formErrors._ && (
                  <p role="alert" className="text-sm text-[var(--color-danger)] mb-2">
                    {formErrors._[0]}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!selectedDate || !selectedSlot}
                  className="w-full py-3 px-4 bg-[var(--color-info)] text-white font-semibold rounded-[var(--radius-control)] hover:bg-[var(--color-info)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t("continue")}
                </button>
              </form>
            )}

            {/* ── Step: details ── */}
            {step === "details" && (
              <form ref={formRef} onSubmit={handleSubmitBooking} className="space-y-5">
                {/* Customer info */}
                <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
                  <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">{t("yourDetails")}</h2>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label htmlFor="firstName" className="block text-xs text-[var(--color-text-muted)] mb-1">
                        {t("firstName")} <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        defaultValue={prefill?.firstName ?? ""}
                        required
                        className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-xs text-[var(--color-text-muted)] mb-1">
                        {t("lastName")} <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        defaultValue={prefill?.lastName ?? ""}
                        required
                        className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label htmlFor="email" className="block text-xs text-[var(--color-text-muted)] mb-1">
                        {t("email")} <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        defaultValue={prefill?.email ?? ""}
                        type="email"
                        required
                        onBlur={(e) => handleEmailCheck(e.target.value)}
                        className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-xs text-[var(--color-text-muted)] mb-1">
                        {t("phone")} <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        defaultValue={prefill?.phone ?? ""}
                        type="tel"
                        required
                        className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                      />
                    </div>
                  </div>

                  {/* BANNER DE COBERTURA DO CLUBE DE ASSINATURAS */}
                  {checkingMembership && (
                    <p className="text-xs text-[var(--color-info)] animate-pulse mb-3">
                      Verificando cobertura do Clube de Assinaturas...
                    </p>
                  )}

                  {membershipCoverage?.isCovered && (
                    <div className="mb-3 p-3.5 rounded-[var(--radius-control)] bg-[var(--color-success-light)] border border-[var(--color-success-border)] text-[var(--color-success)] text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-[var(--color-success)]">
                        <span>✨ Agendamento coberto pelo seu plano:</span>
                        <span className="underline">{membershipCoverage.planName}</span>
                      </div>
                      <p className="text-[var(--text-2xs)] text-[var(--color-success)]">
                        {membershipCoverage.isUnlimited
                          ? "Você possui agendamentos ilimitados ativos. Valor a pagar: R$ 0,00."
                          : `Será debitado 1 crédito do seu pacote (${membershipCoverage.remainingSessions ?? 0} restante(s)). Valor a pagar: R$ 0,00.`}
                      </p>
                    </div>
                  )}

                  {membershipCoverage && !membershipCoverage.isCovered && membershipCoverage.discountPercent && membershipCoverage.discountPercent > 0 && (
                    <div className="mb-3 p-3 rounded-[var(--radius-control)] bg-[var(--color-primary-light)] border border-[var(--color-primary)] text-[var(--color-primary)] text-xs">
                      <p className="font-bold">
                        🎁 Membro {membershipCoverage.planName}: {membershipCoverage.discountPercent}% de desconto aplicado!
                      </p>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                    <input
                      type="checkbox"
                      name="sendReminders"
                      value="true"
                      defaultChecked
                      className="rounded"
                    />
                    {t("reminders")}
                  </label>

                  {prefill && (
                    /* Só aparece para quem está logado: sem conta não há onde
                       guardar. Marcada por padrão porque é o dado da própria
                       pessoa indo para a conta dela — mesma lógica do autofill
                       do navegador —, mas dita em voz alta em vez de
                       acontecer em silêncio. */
                    <label className="flex items-start gap-2 text-sm text-[var(--color-text)] mt-2">
                      <input
                        type="checkbox"
                        name="saveProfile"
                        value="true"
                        defaultChecked
                        className="rounded mt-0.5"
                      />
                      <span>
                        Guardar meus dados para agendar mais rápido
                        <span className="block text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-2xs)" }}>
                          Ficam na sua conta, não com esta empresa. Dá para apagar quando quiser.
                        </span>
                      </span>
                    </label>
                  )}

                  {/* Marketing em caixa separada e DESMARCADA.
                      Lembrete de agendamento é serviço — o cliente pediu ao
                      agendar. Oferta é marketing, e consentimento agregado
                      (uma caixa para as duas coisas, já marcada) não vale
                      como consentimento em lugar nenhum. */}
                  <label className="flex items-start gap-2 text-sm text-[var(--color-text)] mt-2">
                    <input
                      type="checkbox"
                      name="acceptsMarketing"
                      value="true"
                      className="rounded mt-0.5"
                    />
                    <span>
                      {t("marketingOptIn")}
                      <span className="block text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-2xs)" }}>
                        {t("marketingOptInHint")}
                      </span>
                    </span>
                  </label>

                  {/* VALE-PRESENTE / GIFT CARD */}
                  <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-2">
                    <label className="block text-xs font-bold text-[var(--color-text)]">
                      Possui um Vale-Presente / Gift Card?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={giftCardInput}
                        onChange={(e) => setGiftCardInput(e.target.value.toUpperCase())}
                        placeholder="Ex: GIFT-8X9K-42M1"
                        disabled={!!appliedGiftCard}
                        className="flex-1 border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-xs uppercase font-mono text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] disabled:bg-[var(--color-bg-muted)]"
                      />
                      {appliedGiftCard ? (
                        <button
                          type="button"
                          onClick={handleRemoveGiftCard}
                          className="px-3 py-2 text-xs font-bold text-[var(--color-danger)] border border-[var(--color-danger-border)] bg-[var(--color-danger-light)] hover:bg-[var(--color-danger-light)] rounded-[var(--radius-control)] transition-colors cursor-pointer"
                        >
                          Remover
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleApplyGiftCard}
                          disabled={validatingGiftCard || !giftCardInput.trim()}
                          className="px-4 py-2 text-xs font-bold text-white bg-[var(--color-info)] hover:bg-[var(--color-info)] disabled:opacity-50 rounded-[var(--radius-control)] transition-colors cursor-pointer"
                        >
                          {validatingGiftCard ? "Validando..." : "Aplicar"}
                        </button>
                      )}
                    </div>

                    {giftCardError && (
                      <p className="text-[var(--text-2xs)] text-[var(--color-danger)] font-medium">{giftCardError}</p>
                    )}

                    {appliedGiftCard && (
                      <div className="p-2.5 rounded-[var(--radius-control)] bg-[var(--color-success-light)] border border-[var(--color-success-border)] text-[var(--color-success)] text-xs flex items-center justify-between">
                        <span>
                          ✓ Vale {appliedGiftCard.code} aplicado (Saldo: {formatMoney(appliedGiftCard.balance, currency, locale)})
                        </span>
                        <span className="font-bold">
                          - {formatMoney(appliedGiftCard.discountAmount, currency, locale)}
                        </span>
                      </div>
                    )}

                    {/* Hidden input para submissão no form */}
                    {appliedGiftCard && (
                      <input type="hidden" name="giftCardCode" value={appliedGiftCard.code} />
                    )}
                  </div>
                </div>

                {/* Address & Home Access Contextual */}
                {isHomeService ? (
                  <>
                    {/* Address */}
                    <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
                      <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">{t("serviceAddress")}</h2>
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="address" className="block text-xs text-[var(--color-text-muted)] mb-1">
                            {t("address")} <span aria-hidden="true">*</span>
                          </label>
                          <input
                            id="address"
                            name="address"
                            defaultValue={prefill?.address ?? ""}
                            required
                            className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="aptNo" className="block text-xs text-[var(--color-text-muted)] mb-1">
                              {t("apt")}
                            </label>
                            <input
                              id="aptNo"
                              name="aptNo"
                              defaultValue={prefill?.aptNo ?? ""}
                              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                            />
                          </div>
                          <div>
                            <label htmlFor="zip" className="block text-xs text-[var(--color-text-muted)] mb-1">
                              {t("zip")} <span aria-hidden="true">*</span>
                            </label>
                            <input
                              id="zip"
                              name="zip"
                              defaultValue={prefill?.zip ?? ""}
                              required
                              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                            />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="city" className="block text-xs text-[var(--color-text-muted)] mb-1">
                            {t("city")} <span aria-hidden="true">*</span>
                          </label>
                          <input
                            id="city"
                            name="city"
                            defaultValue={prefill?.city ?? ""}
                            required
                            className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Home access */}
                    <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
                      <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">{t("homeAccess")}</h2>
                      <fieldset className="space-y-2 mb-3">
                        <legend className="text-xs text-[var(--color-text-muted)] mb-2">{t("howEnter")}</legend>
                        <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                          <input
                            type="radio"
                            name="accessType"
                            value="someone_home"
                            defaultChecked
                          />
                          {t("someoneHome")}
                        </label>
                        <label className="flex items-center gap-2 text-sm text-[var(--color-text)] cursor-pointer">
                          <input type="radio" name="accessType" value="hide_keys" />
                          {t("hideKeys")}
                        </label>
                      </fieldset>
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text)] mb-3">
                        <input
                          type="checkbox"
                          name="keepKeyWithProvider"
                          value="true"
                        />
                        {t("keepKey")}
                      </label>
                      <div className="mb-3">
                        <label htmlFor="accessNote" className="block text-xs text-[var(--color-text-muted)] mb-1">
                          {t("accessNote")}
                        </label>
                        <textarea
                          id="accessNote"
                          name="accessNote"
                          rows={2}
                          placeholder={t("accessNotePlaceholder")}
                          className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] resize-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="additionalNote" className="block text-xs text-[var(--color-text-muted)] mb-1">
                          {t("additionalNote")}
                        </label>
                        <textarea
                          id="additionalNote"
                          name="additionalNote"
                          rows={2}
                          className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] resize-none"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <input type="hidden" name="address" value="No local / Estabelecimento" />
                    <input type="hidden" name="city" value="Principal" />
                    <input type="hidden" name="zip" value="00000-000" />
                    <input type="hidden" name="accessType" value="someone_home" />
                    <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
                      <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1">Observações do Agendamento</h2>
                      <p className="text-xs text-[var(--color-text-muted)] mb-3">Deseja adicionar alguma preferência ou aviso especial? (opcional)</p>
                      <textarea
                        id="additionalNote"
                        name="additionalNote"
                        rows={2}
                        placeholder="Ex: preferência de profissional, estilo, restrições..."
                        className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] resize-none"
                      />
                    </div>
                  </>
                )}

                {/* Payment method */}
                <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
                  <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-3">{t("paymentMethod")}</h2>
                  {paymentMethods.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {t("noPaymentMethods")}
                    </p>
                  ) : (
                    <fieldset className="space-y-2">
                      <legend className="sr-only">{t("selectPayment")}</legend>
                      {paymentMethods.map((method, idx) => (
                        <label
                          key={`${method.id}-${idx}`}
                          className="block p-3 border border-[var(--color-border)] rounded-[var(--radius-control)] cursor-pointer hover:border-[var(--color-info-border)] has-[:checked]:border-[var(--color-info-border)] has-[:checked]:bg-[var(--color-info-light)]"
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="paymentMethodChoice"
                              checked={selectedMethodIdx === idx}
                              onChange={() => setSelectedMethodIdx(idx)}
                            />
                            <span className="text-sm text-[var(--color-text)]">{method.label}</span>
                          </span>
                          {selectedMethodIdx === idx && method.kind === "MANUAL" && (method.handle || method.instructions) && (
                            <span className="block mt-2 ml-7 text-xs text-[var(--color-text-muted)]">
                              {method.handle && (
                                <span className="block font-medium text-[var(--color-text)]">{method.handle}</span>
                              )}
                              {method.instructions && <span className="block mt-0.5">{method.instructions}</span>}
                            </span>
                          )}
                        </label>
                      ))}
                    </fieldset>
                  )}
                </div>

                {formErrors._ && (
                  <p role="alert" className="text-sm text-[var(--color-danger)]">
                    {formErrors._[0]}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("datetime")}
                    className="flex-1 py-3 px-4 border border-[var(--color-border)] text-[var(--color-text)] font-semibold rounded-[var(--radius-control)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                  >
                    {t("back")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-4 bg-[var(--color-info)] text-white font-semibold rounded-[var(--radius-control)] hover:bg-[var(--color-info)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? t("confirming") : t("confirmBooking")}
                  </button>
                </div>
              </form>
            )}

            {/* ── Step: PIX QR Code ── */}
            {step === "pix" && pixData && bookingId && (
              <PixStep
                qrCode={pixData.qrCode}
                qrCodeBase64={pixData.qrCodeBase64}
                bookingId={bookingId}
                companySlug={companySlug}
                configId={configId}
              />
            )}

            {/* ── Step: payment (Stripe) ── */}
            {step === "payment" && stripeClientSecret && (
              <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
                <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">{t("payment")}</h2>
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret: stripeClientSecret }}
                >
                  <StripePaymentForm returnUrl={returnUrl} />
                </Elements>
              </div>
            )}
          </div>

          {/* Order summary sidebar */}
          <aside>
            <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5 sticky top-6">
              <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-3">{t("summary")}</h2>
              {selectedDate && selectedSlot && (
                <div className="mb-3 pb-3 border-b border-[var(--color-border)]">
                  <p className="text-xs text-[var(--color-text-muted)] mb-0.5">{t("dateTime")}</p>
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {t("dateAt", { date: selectedDate.split("-").reverse().join("/"), time: selectedSlot.startTime })}
                  </p>
                </div>
              )}
              <ul className="space-y-1.5 mb-3">
                {orderItems.map((item, i) => (
                  <li key={i} className="flex justify-between text-xs text-[var(--color-text-muted)]">
                    <span className="flex-1 mr-2">{item.label}</span>
                    <span className="font-medium text-[var(--color-text)] shrink-0">
                      {formatMoney(item.subtotal, currency, locale)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[var(--color-border)] pt-3 space-y-1.5">
                {membershipCoverage?.isCovered ? (
                  <>
                    <div className="flex justify-between text-xs text-[var(--color-success)] font-semibold bg-[var(--color-success-light)] p-2 rounded-[var(--radius-control)]">
                      <span>Plano {membershipCoverage.planName}:</span>
                      <span>- {formatMoney(estimateTotal, currency, locale)}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-sm font-semibold text-[var(--color-text)]">{t("total")}</span>
                      <span className="text-base font-bold text-[var(--color-success)]">
                        {formatMoney(0, currency, locale)} (Coberto)
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {membershipCoverage?.discountPercent && membershipCoverage.discountPercent > 0 && (
                      <div className="flex justify-between text-xs text-[var(--color-primary)] font-semibold bg-[var(--color-primary-light)] p-2 rounded-[var(--radius-control)]">
                        <span>Desconto Membro ({membershipCoverage.discountPercent}%):</span>
                        <span>- {formatMoney((estimateTotal * membershipCoverage.discountPercent) / 100, currency, locale)}</span>
                      </div>
                    )}

                    {offPeak && (
                      <div className="flex justify-between text-xs text-[var(--color-success)] font-semibold bg-[var(--color-success-light)] p-2 rounded-[var(--radius-control)]">
                        <span>{offPeak.window.label} ({offPeak.discountPercentage}% OFF):</span>
                        <span>- {formatMoney(offPeak.discountAmount, currency, locale)}</span>
                      </div>
                    )}

                    {appliedGiftCard && (
                      <div className="flex justify-between text-xs text-[var(--color-success)] font-semibold bg-[var(--color-success-light)] p-2 rounded-[var(--radius-control)]">
                        <span>Vale-Presente ({appliedGiftCard.code}):</span>
                        <span>- {formatMoney(appliedGiftCard.discountAmount, currency, locale)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-1">
                      <span className="text-sm font-semibold text-[var(--color-text)]">{t("total")}</span>
                      <span className="text-base font-bold text-[var(--color-text-heading)]">
                        {formatMoney(finalTotal, currency, locale)}
                      </span>
                    </div>
                  </>
                )}

                {requireDeposit && (
                  <div className="pt-2 mt-2 border-t border-dashed border-[var(--color-border)] space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary-light)] p-2 rounded-[var(--radius-control)]">
                      <span>Sinal para Reserva ({depositPercentage}%):</span>
                      <span>{formatMoney(calculateDeposit(finalTotal, depositPercentage ?? 30).deposit, currency, locale)}</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-2xs)] text-[var(--color-text-muted)] px-1">
                      <span>Restante no local:</span>
                      <span>{formatMoney(calculateDeposit(finalTotal, depositPercentage ?? 30).remaining, currency, locale)}</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-subtle)] mt-2">
                {t("frequencyLabel", {
                  value:
                    frequency === "WEEKLY" ? tb("freqWeekly")
                    : frequency === "BIWEEKLY" ? tb("freqBiweekly")
                    : frequency === "MONTHLY" ? tb("freqMonthly")
                    : tb("freqOnce"),
                })}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
