"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getCompanyStripeSubscriptionsAction,
  cancelSpecificSubscriptionWithRefundAction,
  StripeSubscriptionDetail,
} from "@/server/actions/admin-subscriptions";
import { toast } from "@/lib/toast-service";

type Props = {
  companySlug: string;
  companyName: string;
  onClose: () => void;
};

export function SubscriptionsModal({ companySlug, companyName, onClose }: Props) {
  const [subscriptions, setSubscriptions] = useState<StripeSubscriptionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refundingSubId, setRefundingSubId] = useState<string | null>(null);
  const [issueRefundMap, setIssueRefundMap] = useState<Record<string, boolean>>({});

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadSubs() {
      setLoading(true);
      setError(null);
      const res = await getCompanyStripeSubscriptionsAction(companySlug);
      if (res.success && res.subscriptions) {
        setSubscriptions(res.subscriptions);
        const map: Record<string, boolean> = {};
        res.subscriptions.forEach((s) => {
          map[s.id] = true; // Reembolsar por padrão se for cancelada pelo admin
        });
        setIssueRefundMap(map);
      } else {
        setError(res.error || "Não foi possível carregar as assinaturas do Stripe.");
      }
      setLoading(false);
    }
    loadSubs();
  }, [companySlug]);

  function handleCancelSubscription(subId: string) {
    const issueRefund = issueRefundMap[subId] ?? false;

    if (
      !confirm(
        `Tem certeza que deseja cancelar a assinatura ${subId}?` +
          (issueRefund ? " O valor pago será REEMBOLSADO no cartão do cliente." : "")
      )
    ) {
      return;
    }

    setRefundingSubId(subId);
    startTransition(async () => {
      const res = await cancelSpecificSubscriptionWithRefundAction({
        companySlug,
        subscriptionId: subId,
        issueRefund,
      });

      if (res.success) {
        toast.success("Assinatura Cancelada", res.message || "Assinatura encerrada no Stripe.");
        setSubscriptions((prev) =>
          prev.map((item) =>
            item.id === subId ? { ...item, status: "canceled" } : item
          )
        );
      } else {
        toast.error("Erro no Cancelamento", res.error || "Falha ao cancelar assinatura.");
      }
      setRefundingSubId(null);
    });
  }

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString("pt-BR");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-[var(--color-border)]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">Gerenciar Assinaturas no Stripe</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Empresa: {companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] p-1 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-12 text-center text-xs text-[var(--color-text-subtle)] font-semibold animate-pulse">
            Consultando assinaturas ativas e histórico no Stripe...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* List of subscriptions */}
        {!loading && !error && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {subscriptions.length === 0 ? (
              <p className="text-center py-8 text-xs text-[var(--color-text-subtle)]">
                Nenhuma assinatura encontrada no Stripe para esta empresa.
              </p>
            ) : (
              subscriptions.map((sub) => {
                const isActive = sub.status === "active" || sub.status === "trialing";
                const isCanceled = sub.status === "canceled";

                return (
                  <div
                    key={sub.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isActive
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 opacity-80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--color-text-heading)] text-sm">
                            {sub.planName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-[var(--color-text-subtle)] mt-1">ID: {sub.id}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-black text-[var(--color-text-heading)]">
                          {sub.currency} {sub.amount.toFixed(2)}{" "}
                          <span className="text-xs font-normal text-[var(--color-text-muted)]">
                            /{sub.interval === "year" ? "ano" : "mês"}
                          </span>
                        </p>
                        <p className="text-[11px] text-[var(--color-text-subtle)]">
                          Criada em: {formatDate(sub.created)}
                        </p>
                      </div>
                    </div>

                    {/* Ações por assinatura */}
                    {isActive && (
                      <div className="pt-3 border-t border-[var(--color-border)]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-xs text-[var(--color-text)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={issueRefundMap[sub.id] ?? true}
                            onChange={(e) =>
                              setIssueRefundMap((prev) => ({
                                ...prev,
                                [sub.id]: e.target.checked,
                              }))
                            }
                            className="rounded border-[var(--color-border-strong)] text-red-600 focus:ring-red-500"
                          />
                          <span>Efetuar reembolso automático no cartão ao cancelar</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleCancelSubscription(sub.id)}
                          disabled={isPending || refundingSubId === sub.id}
                          className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 shrink-0"
                        >
                          {refundingSubId === sub.id
                            ? "Processando..."
                            : "Cancelar ESTA Assinatura"}
                        </button>
                      </div>
                    )}

                    {isCanceled && (
                      <p className="text-xs text-[var(--color-text-subtle)] italic pt-2 border-t border-[var(--color-border)]/60">
                        Assinatura cancelada no Stripe.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[var(--color-navy)] text-white rounded-xl text-xs font-bold hover:bg-[var(--color-navy-hover)] transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
