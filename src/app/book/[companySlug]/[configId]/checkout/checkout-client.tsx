"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getAvailableSlotsAction } from "@/server/actions/booking-slots";
import { createBookingAction } from "@/server/actions/booking";
import type { TimeSlot } from "@/lib/agenda";
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
};

type Step = "datetime" | "details" | "payment";

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
      setError(error.message ?? "Erro ao processar pagamento");
      setPaying(false);
    }
    // On success, Stripe redirects to returnUrl
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {error && (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {paying ? "Processando…" : "Pagar agora"}
      </button>
    </form>
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
}: Props) {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>("datetime");

  // DateTime state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, startSlotTransition] = useTransition();

  // Booking state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [submitting, startSubmitTransition] = useTransition();
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  const formRef = useRef<HTMLFormElement>(null);

  // Calendar keyboard nav
  const calGridRef = useRef<HTMLTableSectionElement>(null);
  const [focusedDate, setFocusedDate] = useState<string | null>(null);

  function handleDateSelect(dateStr: string) {
    if (isDateDisabled(dateStr, agendaConfig)) return;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setAvailableSlots([]);
    startSlotTransition(async () => {
      const slots = await getAvailableSlotsAction(agendaId, dateStr);
      setAvailableSlots(slots);
    });
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
  const DAY_ABBREVS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) {
      setFormErrors({ _: ["Selecione data e horário"] });
      return;
    }
    setFormErrors({});
    setStep("details");
  }

  function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("estimateId", estimateId);
    fd.set("agendaId", agendaId);
    fd.set("scheduledDate", selectedDate!);
    fd.set("scheduledStartTime", selectedSlot!.startTime);
    fd.set("scheduledEndTime", selectedSlot!.endTime);

    startSubmitTransition(async () => {
      const result = await createBookingAction(fd);
      if (!result.success) {
        setFormErrors(result.errors);
        return;
      }
      setBookingId(result.bookingId);
      if (result.paymentMethod === "CASH_CHECK") {
        router.push(
          `/book/${companySlug}/${configId}/confirmed?booking=${result.bookingId}`
        );
        return;
      }
      setStripeClientSecret(result.clientSecret);
      setStep("payment");
    });
  }

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${companySlug}/${configId}/confirmed?booking=${bookingId}`;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <span className="text-white font-bold">{companyName[0].toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">{companyName}</h1>
            <p className="text-xs text-gray-500">{configName}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Step indicator */}
        <nav aria-label="Etapas do agendamento" className="mb-8">
          <ol className="flex items-center gap-2 text-sm">
            <li className="text-gray-400 line-through">
              <Link href={`/book/${companySlug}/${configId}`}>Serviços</Link>
            </li>
            <li className="text-gray-300" aria-hidden="true">›</li>
            <li
              className={step === "datetime" ? "font-semibold text-blue-600" : "text-gray-400"}
              aria-current={step === "datetime" ? "step" : undefined}
            >
              Data e hora
            </li>
            <li className="text-gray-300" aria-hidden="true">›</li>
            <li
              className={step === "details" ? "font-semibold text-blue-600" : "text-gray-400"}
              aria-current={step === "details" ? "step" : undefined}
            >
              Seus dados
            </li>
            <li className="text-gray-300" aria-hidden="true">›</li>
            <li
              className={step === "payment" ? "font-semibold text-blue-600" : "text-gray-400"}
              aria-current={step === "payment" ? "step" : undefined}
            >
              Pagamento
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">

            {/* ── Step: datetime ── */}
            {step === "datetime" && (
              <form onSubmit={handleSubmitDetails}>
                {/* Calendar */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
                        else setCalMonth(m => m - 1);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100"
                      aria-label="Mês anterior"
                    >
                      ‹
                    </button>
                    <h2 className="text-sm font-semibold text-gray-900">
                      {MONTH_NAMES[calMonth]} {calYear}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
                        else setCalMonth(m => m + 1);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100"
                      aria-label="Próximo mês"
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
                            className="text-xs text-gray-400 font-medium pb-2"
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
                                    !isCurrentMonth ? "text-gray-300" : "",
                                    disabled ? "cursor-not-allowed opacity-40" : "hover:bg-blue-50",
                                    isSelected ? "bg-blue-600 text-white hover:bg-blue-600" : "",
                                    isToday && !isSelected ? "border border-blue-400 text-blue-600" : "",
                                    !isSelected && !isToday && isCurrentMonth ? "text-gray-700" : "",
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
                  <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
                    <h2 className="text-sm font-semibold text-gray-900 mb-3">
                      Horários disponíveis — {selectedDate.split("-").reverse().join("/")}
                    </h2>
                    {loadingSlots ? (
                      <p className="text-sm text-gray-500">Carregando horários…</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Nenhum horário disponível neste dia. Escolha outra data.
                      </p>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedSlot(availableSlots[0])}
                          className="text-xs text-blue-600 hover:underline mb-3 block"
                        >
                          Selecionar primeiro disponível
                        </button>
                        <div
                          className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                          role="group"
                          aria-label="Horários disponíveis"
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
                                  "py-2 px-3 rounded-lg text-sm font-medium border transition-colors",
                                  isSelected
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50",
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
                  <p role="alert" className="text-sm text-red-600 mb-2">
                    {formErrors._[0]}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!selectedDate || !selectedSlot}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continuar
                </button>
              </form>
            )}

            {/* ── Step: details ── */}
            {step === "details" && (
              <form ref={formRef} onSubmit={handleSubmitBooking} className="space-y-5">
                {/* Customer info */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Seus dados</h2>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label htmlFor="firstName" className="block text-xs text-gray-600 mb-1">
                        Nome <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-xs text-gray-600 mb-1">
                        Sobrenome <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label htmlFor="email" className="block text-xs text-gray-600 mb-1">
                        E-mail <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-xs text-gray-600 mb-1">
                        Telefone <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="sendReminders"
                      value="true"
                      defaultChecked
                      className="rounded"
                    />
                    Receber lembretes por e-mail
                  </label>
                </div>

                {/* Address */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Endereço do serviço</h2>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="address" className="block text-xs text-gray-600 mb-1">
                        Endereço <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="address"
                        name="address"
                        required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="aptNo" className="block text-xs text-gray-600 mb-1">
                          Apto / Complemento
                        </label>
                        <input
                          id="aptNo"
                          name="aptNo"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="zip" className="block text-xs text-gray-600 mb-1">
                          CEP <span aria-hidden="true">*</span>
                        </label>
                        <input
                          id="zip"
                          name="zip"
                          required
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="city" className="block text-xs text-gray-600 mb-1">
                        Cidade <span aria-hidden="true">*</span>
                      </label>
                      <input
                        id="city"
                        name="city"
                        required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Home access */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-4">Acesso à propriedade</h2>
                  <fieldset className="space-y-2 mb-3">
                    <legend className="text-xs text-gray-600 mb-2">Como a equipe entrará?</legend>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="accessType"
                        value="someone_home"
                        defaultChecked
                      />
                      Alguém estará em casa
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="radio" name="accessType" value="hide_keys" />
                      Deixarei as chaves em lugar combinado
                    </label>
                  </fieldset>
                  <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                    <input
                      type="checkbox"
                      name="keepKeyWithProvider"
                      value="true"
                    />
                    Manter chave com o prestador para próximas visitas
                  </label>
                  <div className="mb-3">
                    <label htmlFor="accessNote" className="block text-xs text-gray-600 mb-1">
                      Instruções de acesso (opcional)
                    </label>
                    <textarea
                      id="accessNote"
                      name="accessNote"
                      rows={2}
                      placeholder="Ex.: chaves debaixo do tapete, código do portão…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="additionalNote" className="block text-xs text-gray-600 mb-1">
                      Observações adicionais (opcional)
                    </label>
                    <textarea
                      id="additionalNote"
                      name="additionalNote"
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                {/* Payment method */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">Forma de pagamento</h2>
                  <fieldset className="space-y-2">
                    <legend className="sr-only">Selecione a forma de pagamento</legend>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="CARD"
                        defaultChecked
                      />
                      <span className="text-sm text-gray-700">Cartão de crédito / débito</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                      <input type="radio" name="paymentMethod" value="CASH_CHECK" />
                      <span className="text-sm text-gray-700">Dinheiro / Cheque (no dia do serviço)</span>
                    </label>
                  </fieldset>
                </div>

                {formErrors._ && (
                  <p role="alert" className="text-sm text-red-600">
                    {formErrors._[0]}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("datetime")}
                    className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? "Confirmando…" : "Confirmar agendamento"}
                  </button>
                </div>
              </form>
            )}

            {/* ── Step: payment (Stripe) ── */}
            {step === "payment" && stripeClientSecret && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Pagamento</h2>
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
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Resumo</h2>
              {selectedDate && selectedSlot && (
                <div className="mb-3 pb-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500 mb-0.5">Data e horário</p>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedDate.split("-").reverse().join("/")} às {selectedSlot.startTime}
                  </p>
                </div>
              )}
              <ul className="space-y-1.5 mb-3">
                {orderItems.map((item, i) => (
                  <li key={i} className="flex justify-between text-xs text-gray-600">
                    <span className="flex-1 mr-2">{item.label}</span>
                    <span className="font-medium text-gray-800 shrink-0">
                      {item.subtotal.toLocaleString("pt-BR", {
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
                  {estimateTotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Frequência: {frequency}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
