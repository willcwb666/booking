"use client";

import { useReducer, useEffect, useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { upsertEstimateAction, submitEstimateAction, saveEstimateAction } from "@/server/actions/estimate";
import { formatMoney } from "@/lib/format";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { AIBookingCopilot } from "@/components/ui/ai-booking-copilot";

export type ServiceTypeData = {
  id: string;
  name: string;
  serviceName: string;
  price: number;
  promoPrice: number | null;
  promoDescription: string | null;
  estimatedMinutes: number;
  allowQuantity: boolean;
};

export type ExtraServiceData = {
  id: string;
  name: string;
  price: number;
  estimatedMinutes: number;
  allowQuantity: boolean;
};

type Props = {
  companySlug: string;
  configId: string;
  companyName: string;
  companyLogo: string | null;
  configName: string;
  allowPartialService: boolean;
  serviceTypes: ServiceTypeData[];
  extraServices: ExtraServiceData[];
  currency: string;
  locale: string;
  isLoggedIn: boolean;
};

type State = {
  serviceItems: Record<string, number>; // id -> qty (0 = not selected)
  extraItems: Record<string, number>; // id -> qty (0 = not selected)
  frequency: "ONCE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
};

type Action =
  | { type: "SET_QTY"; id: string; qty: number }
  | { type: "SET_EXTRA_QTY"; id: string; qty: number }
  | { type: "SET_FREQUENCY"; freq: State["frequency"] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_QTY":
      return {
        ...state,
        serviceItems: { ...state.serviceItems, [action.id]: Math.max(0, action.qty) },
      };
    case "SET_EXTRA_QTY":
      return {
        ...state,
        extraItems: { ...state.extraItems, [action.id]: Math.max(0, action.qty) },
      };
    case "SET_FREQUENCY":
      return { ...state, frequency: action.freq };
  }
}

const FREQ_KEYS: { value: State["frequency"]; key: "freqOnce" | "freqWeekly" | "freqBiweekly" | "freqMonthly" }[] = [
  { value: "ONCE", key: "freqOnce" },
  { value: "WEEKLY", key: "freqWeekly" },
  { value: "BIWEEKLY", key: "freqBiweekly" },
  { value: "MONTHLY", key: "freqMonthly" },
];

function fmt(price: number, currency: string, locale: string) {
  return formatMoney(price, currency, locale);
}
function fmtMin(m: number) {
  return m < 60 ? `${m}min` : `${(m / 60).toFixed(1).replace(".0", "")}h`;
}

function effectivePrice(st: ServiceTypeData) {
  return st.promoPrice ?? st.price;
}

export function BookingClient({
  companySlug,
  configId,
  companyName,
  companyLogo,
  configName,
  allowPartialService,
  serviceTypes,
  extraServices,
  currency,
  locale,
  isLoggedIn,
}: Props) {
  const router = useRouter();
  const t = useTranslations("booking");
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const initServiceItems: Record<string, number> = {};
  for (const st of serviceTypes) initServiceItems[st.id] = allowPartialService ? 0 : 1;

  const [state, dispatch] = useReducer(reducer, {
    serviceItems: initServiceItems,
    extraItems: {},
    frequency: "ONCE",
  });

  // Autosave
  const estimateIdRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hasItem = Object.values(state.serviceItems).some((q) => q > 0);
    if (!hasItem) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const fd = buildFd(state);
      const result = await upsertEstimateAction(fd);
      if (result.success) estimateIdRef.current = result.estimateId;
    }, 1000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function buildFd(s: State) {
    const fd = new FormData();
    fd.set("bookingConfigId", configId);
    fd.set("estimateId", estimateIdRef.current ?? "");
    fd.set("frequency", s.frequency);
    fd.set(
      "serviceItems",
      JSON.stringify(
        Object.entries(s.serviceItems)
          .filter(([, q]) => q > 0)
          .map(([serviceTypeId, quantity]) => ({ serviceTypeId, quantity }))
      )
    );
    fd.set(
      "extraItems",
      JSON.stringify(
        Object.entries(s.extraItems)
          .filter(([, q]) => q > 0)
          .map(([extraServiceId, quantity]) => ({ extraServiceId, quantity }))
      )
    );
    return fd;
  }

  function handleSubmit() {
    const fd = buildFd(state);
    startTransition(async () => {
      const result = await submitEstimateAction(fd);
      if (result.success) {
        router.push(`/book/${companySlug}/${configId}/checkout?estimate=${result.estimateId}`);
      } else {
        setSubmitError(result.errors._?.[0] ?? t("processError"));
      }
    });
  }

  // "Salvar orçamento": garante o rascunho no banco; logado → vincula à conta,
  // anônimo → login/cadastro e o orçamento é reivindicado na volta
  function handleSaveQuote() {
    setSubmitError(null);
    startSaving(async () => {
      const upsert = await upsertEstimateAction(buildFd(state));
      if (!upsert.success) {
        setSubmitError(upsert.errors._?.[0] ?? t("saveError"));
        return;
      }
      estimateIdRef.current = upsert.estimateId;

      if (!isLoggedIn) {
        const back = encodeURIComponent(`/orcamentos/claim?estimate=${upsert.estimateId}`);
        router.push(`/login?callbackUrl=${back}`);
        return;
      }

      const fd = new FormData();
      fd.set("estimateId", upsert.estimateId);
      const saved = await saveEstimateAction(fd);
      if (saved.success) {
        router.push("/orcamentos?salvo=1");
      } else {
        setSubmitError(saved.errors._?.[0] ?? t("saveError"));
      }
    });
  }

  // Client-side summary calc (usa preço promocional quando houver)
  const lineItems: { label: string; qty: number; unitPrice: number; subtotal: number }[] = [];
  for (const st of serviceTypes) {
    const qty = state.serviceItems[st.id] ?? 0;
    const price = effectivePrice(st);
    if (qty > 0) lineItems.push({ label: `${st.serviceName} — ${st.name}`, qty, unitPrice: price, subtotal: price * qty });
  }
  for (const es of extraServices) {
    const qty = state.extraItems[es.id] ?? 0;
    if (qty > 0) lineItems.push({ label: es.name, qty, unitPrice: es.price, subtotal: es.price * qty });
  }
  const total = lineItems.reduce((s, i) => s + i.subtotal, 0);
  const hasSelection = lineItems.length > 0;

  // Group service types by service name
  const grouped: Record<string, ServiceTypeData[]> = {};
  for (const st of serviceTypes) {
    if (!grouped[st.serviceName]) grouped[st.serviceName] = [];
    grouped[st.serviceName].push(st);
  }

  const freqLabel = (f: State["frequency"]) =>
    t(FREQ_KEYS.find((o) => o.value === f)!.key);

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] print:bg-[var(--color-bg)]">
      {/* ── Versão de impressão (só aparece no print) ── */}
      <div className="hidden print:block p-8 text-[var(--color-text-heading)]">
        <div className="flex items-center gap-4 border-b border-[var(--color-border-strong)] pb-4 mb-6">
          {companyLogo && (
            <img src={companyLogo} alt="" className="w-16 h-16 rounded-[var(--radius-control)] object-cover" />
          )}
          <div>
            <p className="text-xl font-bold">{companyName}</p>
            <p className="text-sm text-[var(--color-text-muted)]">{configName}</p>
          </div>
          <div className="ml-auto text-right text-sm text-[var(--color-text-muted)]">
            <p className="font-semibold">{t("printTitle")}</p>
            <p>{new Date().toLocaleDateString(locale)}</p>
          </div>
        </div>

        <p className="text-sm mb-4">
          <span className="font-semibold">{t("frequency")}:</span> {freqLabel(state.frequency)}
        </p>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-[var(--color-border-strong)] text-left">
              <th className="py-2 font-semibold">{t("printService")}</th>
              <th className="py-2 font-semibold text-center w-16">{t("printQty")}</th>
              <th className="py-2 font-semibold text-right w-28">{t("printUnit")}</th>
              <th className="py-2 font-semibold text-right w-28">{t("printSubtotal")}</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i} className="border-b border-[var(--color-border)]">
                <td className="py-2">{item.label}</td>
                <td className="py-2 text-center">{item.qty}</td>
                <td className="py-2 text-right">{fmt(item.unitPrice, currency, locale)}</td>
                <td className="py-2 text-right">{fmt(item.subtotal, currency, locale)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="py-3 text-right font-bold">{t("totalEstimated")}</td>
              <td className="py-3 text-right font-bold text-base">{fmt(total, currency, locale)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="text-xs text-[var(--color-text-muted)]">
          {t("printDisclaimer", { date: new Date().toLocaleString(locale) })}
        </p>
      </div>

      {/* Header */}
      <header className="bg-[var(--color-bg)] border-b border-[var(--color-border)] print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-control)] bg-[var(--color-info)] flex items-center justify-center shrink-0" aria-hidden="true">
            {companyLogo ? (
              <img src={companyLogo} alt="" className="w-full h-full rounded-[var(--radius-control)] object-cover" />
            ) : (
              <span className="text-white font-bold">{companyName[0].toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-[var(--color-text-heading)]">{companyName}</h1>
            <p className="text-xs text-[var(--color-text-muted)]">{configName}</p>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 lg:flex lg:gap-8 lg:items-start print:hidden">
        {/* ── Left: Selection ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* AI Booking Assistant Copilot */}
          <AIBookingCopilot companySlug={companySlug} />

          {/* Frequency */}
          <section className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">{t("frequency")}</h2>
            <div role="group" aria-label={t("frequency")} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FREQ_KEYS.map(({ value, key }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={state.frequency === value}
                  onClick={() => dispatch({ type: "SET_FREQUENCY", freq: value })}
                  className={`py-2.5 px-3 text-sm font-medium rounded-[var(--radius-control)] border-2 transition-colors ${
                    state.frequency === value
                      ? "bg-[var(--color-info)] text-white border-[var(--color-info-border)]"
                      : "bg-[var(--color-bg)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-info-border)]"
                  }`}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </section>

          {/* Services */}
          <section className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-1">{t("services")}</h2>
            {!allowPartialService && (
              <p className="text-xs text-[var(--color-text-muted)] mb-4">{t("allIncluded")}</p>
            )}
            {allowPartialService && (
              <p className="text-xs text-[var(--color-text-muted)] mb-4">{t("selectServices")}</p>
            )}

            <div className="space-y-5">
              {Object.entries(grouped).map(([serviceName, types]) => (
                <div key={serviceName}>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">{serviceName}</p>
                  <div className="space-y-2">
                    {types.map((st) => {
                      const qty = state.serviceItems[st.id] ?? 0;
                      const selected = qty > 0;
                      const hasPromo = st.promoPrice != null && st.promoPrice < st.price;
                      return (
                        <div
                          key={st.id}
                          className={`flex items-center gap-3 p-3 rounded-[var(--radius-control)] border transition-colors ${
                            selected ? "border-[var(--color-info-border)] bg-[var(--color-info-light)]" : "border-[var(--color-border)]"
                          }`}
                        >
                          {allowPartialService && (
                            <input
                              type="checkbox"
                              id={`st-${st.id}`}
                              checked={selected}
                              onChange={() => dispatch({ type: "SET_QTY", id: st.id, qty: selected ? 0 : 1 })}
                              className="w-4 h-4 rounded border-[var(--color-border-strong)] text-[var(--color-info)] focus:ring-[var(--color-info)] shrink-0"
                              aria-label={st.name}
                            />
                          )}
                          <label htmlFor={allowPartialService ? `st-${st.id}` : undefined} className="flex-1 min-w-0 cursor-pointer">
                            <span className="text-sm font-medium text-[var(--color-text-heading)] block">
                              {st.name}
                              {hasPromo && (
                                <span className="ml-2 inline-block text-[var(--text-2xs)] font-bold uppercase tracking-wide bg-[var(--color-success-light)] text-[var(--color-success)] rounded-full px-2 py-0.5 align-middle">
                                  {t("promoBadge")}
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {hasPromo ? (
                                <>
                                  <s className="text-[var(--color-text-subtle)]">{fmt(st.price, currency, locale)}</s>{" "}
                                  <span className="text-[var(--color-success)] font-semibold">{fmt(st.promoPrice!, currency, locale)}</span>
                                </>
                              ) : (
                                fmt(st.price, currency, locale)
                              )}
                              {" · "}{fmtMin(st.estimatedMinutes)}
                            </span>
                          </label>
                          {/* Qty counter — só quando o serviço permite quantidade */}
                          {selected && st.allowQuantity && (
                            <div className="flex items-center gap-1" role="group" aria-label={t("quantityOf", { name: st.name })}>
                              <button
                                type="button"
                                onClick={() => dispatch({ type: "SET_QTY", id: st.id, qty: qty - 1 })}
                                aria-label={t("decrease", { name: st.name })}
                                disabled={qty <= 1}
                                className="w-7 h-7 rounded-full border border-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] disabled:opacity-40"
                              >−</button>
                              <span className="w-6 text-center text-sm font-medium" aria-live="polite" aria-atomic="true">{qty}</span>
                              <button
                                type="button"
                                onClick={() => dispatch({ type: "SET_QTY", id: st.id, qty: qty + 1 })}
                                aria-label={t("increase", { name: st.name })}
                                className="w-7 h-7 rounded-full border border-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]"
                              >+</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Extras */}
          {extraServices.length > 0 && (
            <section className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">{t("extras")}</h2>
              <div className="space-y-2" role="group" aria-label={t("extras")}>
                {extraServices.map((es) => {
                  const qty = state.extraItems[es.id] ?? 0;
                  const on = qty > 0;
                  return (
                    <div key={es.id} className={`flex items-center gap-3 p-3 rounded-[var(--radius-control)] border transition-colors ${on ? "border-[var(--color-info-border)] bg-[var(--color-info-light)]" : "border-[var(--color-border)]"}`}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => dispatch({ type: "SET_EXTRA_QTY", id: es.id, qty: on ? 0 : 1 })}
                        aria-label={on ? t("remove", { name: es.name }) : t("add", { name: es.name })}
                        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] focus:ring-offset-1 ${on ? "bg-[var(--color-info)]" : "bg-[var(--color-border-strong)]"}`}
                      >
                        <span className={`block w-4 h-4 rounded-full bg-[var(--color-bg)] shadow transition-transform absolute top-1 ${on ? "translate-x-5" : "translate-x-1"}`} aria-hidden="true" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-[var(--color-text-heading)] block">{es.name}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{fmt(es.price, currency, locale)} · {fmtMin(es.estimatedMinutes)}</span>
                      </div>
                      {/* Qty counter — só quando o extra permite quantidade */}
                      {on && es.allowQuantity && (
                        <div className="flex items-center gap-1" role="group" aria-label={t("quantityOf", { name: es.name })}>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: "SET_EXTRA_QTY", id: es.id, qty: qty - 1 })}
                            aria-label={t("decrease", { name: es.name })}
                            disabled={qty <= 1}
                            className="w-7 h-7 rounded-full border border-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] disabled:opacity-40"
                          >−</button>
                          <span className="w-6 text-center text-sm font-medium" aria-live="polite" aria-atomic="true">{qty}</span>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: "SET_EXTRA_QTY", id: es.id, qty: qty + 1 })}
                            aria-label={t("increase", { name: es.name })}
                            className="w-7 h-7 rounded-full border border-[var(--color-border-strong)] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]"
                          >+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── Right: Summary (desktop sticky) ── */}
        <aside className="hidden lg:block w-72 shrink-0 sticky top-6">
          <Summary
            lineItems={lineItems}
            total={total}
            hasSelection={hasSelection}
            isPending={isPending}
            isSaving={isSaving}
            submitError={submitError}
            onSubmit={handleSubmit}
            onSaveQuote={handleSaveQuote}
            currency={currency}
            locale={locale}
          />
        </aside>
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-[var(--color-bg)] border-t border-[var(--color-border)] px-4 py-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--color-text-muted)]">{t("totalEstimated")}</p>
            <p
              className="text-base font-bold text-[var(--color-text-heading)]"
              aria-live="polite"
              aria-atomic="true"
              aria-label={t("totalLabel", { value: fmt(total, currency, locale) })}
            >
              {fmt(total, currency, locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveQuote}
            disabled={!hasSelection || isSaving}
            className="px-3 py-2.5 text-sm font-semibold text-[var(--color-info)] border border-[var(--color-info-border)] rounded-[var(--radius-control)] hover:bg-[var(--color-info-light)] disabled:opacity-50 shrink-0"
          >
            {isSaving ? t("saving") : t("saveShort")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasSelection || isPending}
            className="px-5 py-2.5 text-sm font-semibold bg-[var(--color-info)] text-white rounded-[var(--radius-control)] hover:bg-[var(--color-info)] disabled:opacity-50 shrink-0"
          >
            {isPending ? t("saving") : t("continueShort")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Summary({
  lineItems,
  total,
  hasSelection,
  isPending,
  isSaving,
  submitError,
  onSubmit,
  onSaveQuote,
  currency,
  locale,
}: {
  lineItems: { label: string; qty: number; unitPrice: number; subtotal: number }[];
  total: number;
  hasSelection: boolean;
  isPending: boolean;
  isSaving: boolean;
  submitError: string | null;
  onSubmit: () => void;
  onSaveQuote: () => void;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("booking");
  return (
    <div className="bg-[var(--color-bg)] rounded-[var(--radius-control)] border border-[var(--color-border)] p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text-heading)] mb-4">{t("summaryTitle")}</h2>
      {lineItems.length === 0 ? (
        <p className="text-sm text-[var(--color-text-subtle)] text-center py-4">{t("noneSelected")}</p>
      ) : (
        <ul
          className="space-y-2 mb-4"
          aria-live="polite"
          aria-atomic="false"
          aria-label={t("summaryTitle")}
        >
          {lineItems.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-2 text-sm">
              <span className="text-[var(--color-text)] flex-1 min-w-0">
                {item.label}
                {item.qty > 1 && <span className="text-[var(--color-text-subtle)] ml-1">×{item.qty}</span>}
              </span>
              <span className="text-[var(--color-text-heading)] font-medium shrink-0">{formatMoney(item.subtotal, currency, locale)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-[var(--color-border)] pt-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-[var(--color-text)]">{t("totalEstimated")}</span>
          <span
            className="text-lg font-bold text-[var(--color-text-heading)]"
            aria-live="polite"
            aria-atomic="true"
            aria-label={t("totalLabel", { value: formatMoney(total, currency, locale) })}
          >
            {formatMoney(total, currency, locale)}
          </span>
        </div>
      </div>

      {submitError && (
        <p className="text-xs text-[var(--color-danger)] mb-3" role="alert">{submitError}</p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!hasSelection || isPending}
        aria-disabled={!hasSelection || isPending}
        className="w-full py-3 text-sm font-semibold bg-[var(--color-info)] text-white rounded-[var(--radius-control)] hover:bg-[var(--color-info)] disabled:opacity-50 transition-colors"
      >
        {isPending ? t("saving") : t("continueBooking")}
      </button>

      <button
        type="button"
        onClick={onSaveQuote}
        disabled={!hasSelection || isSaving}
        aria-disabled={!hasSelection || isSaving}
        className="w-full mt-2 py-3 text-sm font-semibold text-[var(--color-info)] border border-[var(--color-info-border)] rounded-[var(--radius-control)] hover:bg-[var(--color-info-light)] disabled:opacity-50 transition-colors"
      >
        {isSaving ? t("saving") : t("saveQuote")}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        disabled={!hasSelection}
        className="w-full mt-2 py-2.5 text-sm font-medium text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-[var(--radius-control)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50 transition-colors"
      >
        🖨 {t("printQuote")}
      </button>
      <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] mt-2 text-center">
        {t("saveHint")}
      </p>
    </div>
  );
}
