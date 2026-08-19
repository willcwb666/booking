"use client";

import React, { useMemo, useState } from "react";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/lib/toast-service";
import {
  buildPurchaseList,
  RESTOCK_ACTIONABLE,
  RESTOCK_LABELS,
  RESTOCK_VARIANTS,
  type RestockStatus,
} from "@/lib/restock";
import type { RestockItem } from "@/server/queries/restock";
import { Package, Copy, Check } from "@/components/ui/icons";

type Props = {
  companyName: string;
  items: RestockItem[];
  windowDays: number;
};

const FILTERS: { status: RestockStatus; hint: string }[] = [
  { status: "OUT", hint: "Acabou — e ainda vende" },
  { status: "CRITICAL", hint: "Não dá tempo de um pedido chegar" },
  { status: "LOW", hint: "Perto do fim, ou no mínimo que você definiu" },
  { status: "OK", hint: "Cobertura folgada" },
  { status: "STALE", hint: "Parado — repor seria gastar de novo no que não gira" },
];

export function ReposicaoClient({ companyName, items, windowDays }: Props) {
  const company = useCompany();
  const [active, setActive] = useState<RestockStatus[]>(RESTOCK_ACTIONABLE);
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<RestockStatus, number>();
    for (const i of items) map.set(i.status, (map.get(i.status) ?? 0) + 1);
    return map;
  }, [items]);

  const visible = useMemo(
    () =>
      items
        .filter((i) => active.includes(i.status))
        // Do mais urgente ao menos: quem tem menos dias de cobertura primeiro.
        .sort((a, b) => (a.coverDays ?? 9999) - (b.coverDays ?? 9999)),
    [items, active]
  );

  const purchaseText = useMemo(
    () => buildPurchaseList(visible, companyName),
    [visible, companyName]
  );

  const totalCost = visible.reduce((s, i) => s + i.estimatedCost, 0);

  const copyList = async () => {
    await navigator.clipboard.writeText(purchaseText);
    setCopied(true);
    toast.success("Copiado", "Cole no WhatsApp do fornecedor.");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFilter = (status: RestockStatus) =>
    setActive((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Estoque"
        categoryIcon={<Package className="w-3.5 h-3.5" />}
        title="Reposição"
        description={`O que precisa ser comprado, calculado pelo que realmente saiu no caixa nos últimos ${windowDays} dias.`}
        action={
          purchaseText ? (
            <button type="button" onClick={copyList} className="btn btn-primary btn-sm">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copiado" : "Copiar lista de compra"}
            </button>
          ) : undefined
        }
      />

      {/* O que este módulo NÃO faz, dito na tela. Sem isso o dono procura a
          ficha técnica de insumo por serviço e conclui que falta algo. */}
      <p
        className="text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-3 py-2 leading-relaxed"
        style={{ fontSize: "var(--text-2xs)" }}
      >
        Nada aqui depende de você cadastrar quanto de shampoo cada corte gasta. A
        conta sai da venda real do balcão — se um produto vende dez por semana e
        restam três, ele aparece; se não vende há três meses, não aparece, mesmo
        zerado.
      </p>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ status, hint }) => (
          <button
            key={status}
            type="button"
            onClick={() => toggleFilter(status)}
            title={hint}
            aria-pressed={active.includes(status)}
            data-active={active.includes(status) || undefined}
            className="segmented-item"
          >
            {RESTOCK_LABELS[status]}
            <span className="ml-1.5 text-[var(--color-text-subtle)]">
              {counts.get(status) ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Package className="w-5 h-5" />}
            title="Nada a repor"
            description="Nenhum produto nas faixas selecionadas. Se acabou de cadastrar produtos, a lista aparece assim que houver vendas no caixa."
          />
        ) : (
          <>
            <div className="table-container" style={{ border: 0, boxShadow: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Situação</th>
                    <th className="text-right">Em estoque</th>
                    <th className="text-right">Vendeu</th>
                    <th className="text-right">Comprar</th>
                    <th className="text-right">Custo estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((i) => (
                    <tr key={i.productId}>
                      <td>
                        <span className="font-medium text-[var(--color-text-heading)] block">
                          {i.name}
                        </span>
                        {i.sku && (
                          <span
                            className="text-[var(--color-text-muted)] font-mono"
                            style={{ fontSize: "var(--text-2xs)" }}
                          >
                            {i.sku}
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusBadge variant={RESTOCK_VARIANTS[i.status]}>
                          {RESTOCK_LABELS[i.status]}
                        </StatusBadge>
                        <span
                          className="text-[var(--color-text-muted)] block mt-0.5"
                          style={{ fontSize: "var(--text-2xs)" }}
                        >
                          {i.reason}
                        </span>
                      </td>
                      <td data-type="number">
                        {/* Negativo é furo de estoque, não erro de exibição —
                            o PDV permite vender além do saldo de propósito. */}
                        <span
                          className={
                            i.stockQuantity < 0 ? "text-[var(--color-danger)] font-semibold" : ""
                          }
                        >
                          {i.stockQuantity}
                        </span>
                      </td>
                      <td data-type="number">{i.unitsSold}</td>
                      <td data-type="number" className="font-semibold text-[var(--color-text-heading)]">
                        {i.suggestedOrder > 0 ? i.suggestedOrder : "—"}
                      </td>
                      <td data-type="number">
                        {i.estimatedCost > 0
                          ? formatMoney(i.estimatedCost, company.currency, company.locale)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalCost > 0 && (
              <div className="card-body border-t border-[var(--color-border)] flex justify-between items-center">
                <span className="text-xs text-[var(--color-text-muted)]">
                  Custo estimado do pedido
                </span>
                <span className="text-base font-bold text-[var(--color-text-heading)]">
                  {formatMoney(totalCost, company.currency, company.locale)}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {purchaseText && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Pedido pronto para enviar
            </h2>
          </div>
          <div className="card-body">
            {/* Texto simples, não anexo: o dono manda isso do celular, no meio
                do expediente, para um fornecedor que não vai abrir PDF. */}
            <pre
              className="whitespace-pre-wrap font-mono text-[var(--color-text)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] p-3 overflow-x-auto"
              style={{ fontSize: "var(--text-2xs)" }}
            >
              {purchaseText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
