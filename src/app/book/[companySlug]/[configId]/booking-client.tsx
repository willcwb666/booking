"use client";

import { useReducer, useEffect, useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { upsertEstimateAction, submitEstimateAction } from "@/server/actions/estimate";

export type ServiceTypeData = {
  id: string;
  name: string;
  serviceName: string;
  price: number;
  estimatedMinutes: number;
};

export type ExtraServiceData = {
  id: string;
  name: string;
  price: number;
  estimatedMinutes: number;
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
};

type State = {
  serviceItems: Record<string, number>; // id -> qty (0 = not selected)
  extraItems: Record<string, boolean>;
  frequency: "ONCE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
};

type Action =
  | { type: "SET_QTY"; id: string; qty: number }
  | { type: "TOGGLE_EXTRA"; id: string }
  | { type: "SET_FREQUENCY"; freq: State["frequency"] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_QTY":
      return {
        ...state,
        serviceItems: { ...state.serviceItems, [action.id]: Math.max(0, action.qty) },
      };
    case "TOGGLE_EXTRA":
      return {
        ...state,
        extraItems: { ...state.extraItems, [action.id]: !state.extraItems[action.id] },
      };
    case "SET_FREQUENCY":
      return { ...state, frequency: action.freq };
  }
}

const FREQ_OPTIONS: { value: State["frequency"]; label: string }[] = [
  { value: "ONCE", label: "Única vez" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "BIWEEKLY", label: "Quinzenal" },
  { value: "MONTHLY", label: "Mensal" },
];

function fmt(price: number) {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtMin(m: number) {
  return m < 60 ? `${m}min` : `${(m / 60).toFixed(1).replace(".0", "")}h`;
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
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
      "extraServiceIds",
      JSON.stringify(
        Object.entries(s.extraItems).filter(([, v]) => v).map(([id]) => id)
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
        setSubmitError(result.errors._?.[0] ?? "Erro ao processar");
      }
    });
  }

  // Client-side summary calc
  const lineItems: { label: string; qty: number; unitPrice: number; subtotal: number }[] = [];
  for (const st of serviceTypes) {
    const qty = state.serviceItems[st.id] ?? 0;
    if (qty > 0) lineItems.push({ label: `${st.serviceName} — ${st.name}`, qty, unitPrice: st.price, subtotal: st.price * qty });
  }
  for (const es of extraServices) {
    if (state.extraItems[es.id]) lineItems.push({ label: es.name, qty: 1, unitPrice: es.price, subtotal: es.price });
  }
  const total = lineItems.reduce((s, i) => s + i.subtotal, 0);
  const hasSelection = lineItems.length > 0;

  // Group service types by service name
  const grouped: Record<string, ServiceTypeData[]> = {};
  for (const st of serviceTypes) {
    if (!grouped[st.serviceName]) grouped[st.serviceName] = [];
    grouped[st.serviceName].push(st);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0" aria-hidden="true">
            {companyLogo ? (
              <img src={companyLogo} alt="" className="w-full h-full rounded-lg object-cover" />
            ) : (
              <span className="text-white font-bold">{companyName[0].toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">{companyName}</h1>
            <p className="text-xs text-gray-500">{configName}</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 lg:flex lg:gap-8 lg:items-start">
        {/* ── Left: Selection ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Frequency */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Frequência</h2>
            <div role="group" aria-label="Frequência do serviço" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FREQ_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={state.frequency === value}
                  onClick={() => dispatch({ type: "SET_FREQUENCY", freq: value })}
                  className={`py-2.5 px-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                    state.frequency === value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Services */}
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Serviços</h2>
            {!allowPartialService && (
              <p className="text-xs text-gray-500 mb-4">Todos os serviços estão incluídos. Ajuste as quantidades conforme necessário.</p>
            )}
            {allowPartialService && (
              <p className="text-xs text-gray-500 mb-4">Selecione os serviços desejados.</p>
            )}

            <div className="space-y-5">
              {Object.entries(grouped).map(([serviceName, types]) => (
                <div key={serviceName}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{serviceName}</p>
                  <div className="space-y-2">
                    {types.map((st) => {
                      const qty = state.serviceItems[st.id] ?? 0;
                      const selected = qty > 0;
                      return (
                        <div
                          key={st.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            selected ? "border-blue-300 bg-blue-50/50" : "border-gray-200"
                          }`}
                        >
                          {allowPartialService && (
                            <input
                              type="checkbox"
                              id={`st-${st.id}`}
                              checked={selected}
                              onChange={() => dispatch({ type: "SET_QTY", id: st.id, qty: selected ? 0 : 1 })}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                              aria-label={st.name}
                            />
                          )}
                          <label htmlFor={allowPartialService ? `st-${st.id}` : undefined} className="flex-1 min-w-0 cursor-pointer">
                            <span className="text-sm font-medium text-gray-900 block">{st.name}</span>
                            <span className="text-xs text-gray-500">{fmt(st.price)} · {fmtMin(st.estimatedMinutes)}</span>
                          </label>
                          {/* Qty counter */}
                          {selected && (
                            <div className="flex items-center gap-1" role="group" aria-label={`Quantidade de ${st.name}`}>
                              <button
                                type="button"
                                onClick={() => dispatch({ type: "SET_QTY", id: st.id, qty: qty - 1 })}
                                aria-label={`Diminuir quantidade de ${st.name}`}
                                disabled={allowPartialService ? qty <= 1 : qty <= 1}
                                className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                              >−</button>
                              <span className="w-6 text-center text-sm font-medium" aria-live="polite" aria-atomic="true">{qty}</span>
                              <button
                                type="button"
                                onClick={() => dispatch({ type: "SET_QTY", id: st.id, qty: qty + 1 })}
                                aria-label={`Aumentar quantidade de ${st.name}`}
                                className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
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
            <section className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Serviços adicionais</h2>
              <div className="space-y-2" role="group" aria-label="Serviços adicionais opcionais">
                {extraServices.map((es) => {
                  const on = !!state.extraItems[es.id];
                  return (
                    <div key={es.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${on ? "border-blue-300 bg-blue-50/50" : "border-gray-200"}`}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        onClick={() => dispatch({ type: "TOGGLE_EXTRA", id: es.id })}
                        aria-label={`${on ? "Remover" : "Adicionar"} ${es.name}`}
                        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${on ? "bg-blue-600" : "bg-gray-300"}`}
                      >
                        <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform absolute top-1 ${on ? "translate-x-5" : "translate-x-1"}`} aria-hidden="true" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 block">{es.name}</span>
                        <span className="text-xs text-gray-500">{fmt(es.price)} · {fmtMin(es.estimatedMinutes)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── Right: Summary (desktop sticky) ── */}
        <aside className="hidden lg:block w-72 shrink-0 sticky top-6">
          <Summary lineItems={lineItems} total={total} hasSelection={hasSelection} isPending={isPending} submitError={submitError} onSubmit={handleSubmit} />
        </aside>
      </div>

      {/* Mobile: fixed bottom bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">Total estimado</p>
          <p
            className="text-base font-bold text-gray-900"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Total: ${fmt(total)}`}
          >
            {fmt(total)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasSelection || isPending}
          className="px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 shrink-0"
        >
          {isPending ? "Salvando..." : "Continuar →"}
        </button>
      </div>
    </div>
  );
}

function Summary({
  lineItems,
  total,
  hasSelection,
  isPending,
  submitError,
  onSubmit,
}: {
  lineItems: { label: string; qty: number; unitPrice: number; subtotal: number }[];
  total: number;
  hasSelection: boolean;
  isPending: boolean;
  submitError: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Resumo do pedido</h2>
      {lineItems.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhum serviço selecionado</p>
      ) : (
        <ul
          className="space-y-2 mb-4"
          aria-live="polite"
          aria-atomic="false"
          aria-label="Itens selecionados"
        >
          {lineItems.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-2 text-sm">
              <span className="text-gray-700 flex-1 min-w-0">
                {item.label}
                {item.qty > 1 && <span className="text-gray-400 ml-1">×{item.qty}</span>}
              </span>
              <span className="text-gray-900 font-medium shrink-0">{item.subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gray-100 pt-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-700">Total estimado</span>
          <span
            className="text-lg font-bold text-gray-900"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Total: ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
          >
            {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      </div>

      {submitError && (
        <p className="text-xs text-red-600 mb-3" role="alert">{submitError}</p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!hasSelection || isPending}
        aria-disabled={!hasSelection || isPending}
        className="w-full py-3 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? "Salvando..." : "Continuar para agendamento →"}
      </button>
    </div>
  );
}
