"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "@/lib/toast-service";
import {
  Gift,
  Plus,
  Search,
  Users,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  DollarSign,
  Copy,
  Tag,
  AlertTriangle,
  Clock,
  ChevronDown,
} from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import {
  createGiftCardAction,
  cancelGiftCardAction,
} from "@/server/actions/gift-cards";
import type {
  GiftCardStats,
  GiftCardItem,
} from "@/server/queries/gift-cards";

type Props = {
  companySlug: string;
  companyName: string;
  currency: string;
  stats: GiftCardStats;
  giftCardsResult: {
    items: GiftCardItem[];
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
  currentSearch: string;
  currentStatus: string;
};

export function GiftCardsClient({
  companySlug,
  companyName,
  currency,
  stats,
  giftCardsResult,
  currentSearch,
  currentStatus,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Form de Emissão
  const [cardAmount, setCardAmount] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("365");

  const fmtCurrency = (val: number) =>
    val.toLocaleString(currency === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    });

  function updateQuery(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "" || val === undefined) {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleOpenCreateModal() {
    setCardAmount("");
    setCustomCode("");
    setBuyerName("");
    setBuyerEmail("");
    setRecipientName("");
    setRecipientEmail("");
    setRecipientPhone("");
    setMessage("");
    setExpiresInDays("365");
    setIsCreateModalOpen(true);
  }

  function handleSaveGiftCard(e: React.FormEvent) {
    e.preventDefault();
    if (!cardAmount) {
      toast.error("Informe o valor do Gift Card");
      return;
    }

    startTransition(async () => {
      const amountNum = parseFloat(cardAmount.replace(",", "."));
      const daysNum = expiresInDays ? parseInt(expiresInDays, 10) : null;

      const res = await createGiftCardAction(companySlug, {
        amount: amountNum,
        customCode: customCode.trim() || undefined,
        buyerName: buyerName.trim() || undefined,
        buyerEmail: buyerEmail.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        recipientEmail: recipientEmail.trim() || undefined,
        recipientPhone: recipientPhone.trim() || undefined,
        message: message.trim() || undefined,
        expiresInDays: daysNum,
      });

      if (res.success) {
        toast.success("Gift Card emitido com sucesso!");
        setIsCreateModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleCancelGiftCard(id: string) {
    if (!confirm("Deseja realmente cancelar este Gift Card? O saldo restante não poderá mais ser utilizado.")) return;

    startTransition(async () => {
      const res = await cancelGiftCardAction(companySlug, id);
      if (res.success) {
        toast.success("Gift Card cancelado.");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Código ${code} copiado!`);
  }

  return (
    <div className="page-content space-y-8">
      {/* HEADER EXECUTIVO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-[var(--color-border)] shadow-xs relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-extrabold text-xs uppercase tracking-wider">
            <Gift className="w-4 h-4 text-pink-500 animate-pulse" />
            <span>Vendas Antecipadas & Fidelidade</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-extrabold ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
              GIFT CARDS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            Vales-Presente & Gift Cards
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] max-w-xl">
            Emita e gerencie vales digitais com saldo fracionável para atrair novos clientes e antecipar fluxo de caixa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 z-10">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98] text-white rounded-xl transition-all font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-[var(--shadow-primary)]"
          >
            <Plus className="w-4 h-4" />
            <span>Emitir Gift Card</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Total Emitido
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {fmtCurrency(stats.totalIssuedAmount)}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Valor total em vales emitidos
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Saldo Pendente
            </span>
            <div className="p-2.5 rounded-2xl bg-pink-50 text-pink-600 border border-pink-100 shadow-2xs">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {fmtCurrency(stats.totalOutstandingBalance)}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Saldo disponível para resgates
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Vales Ativos
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {stats.activeCardsCount}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Cartões com saldo disponível
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Total de Resgates
            </span>
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {stats.totalRedemptionsCount}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Utilizações em agendamentos
          </p>
        </div>
      </div>

      {/* BARRA DE FILTROS & AÇÕES */}
      <div className="bg-white rounded-3xl border border-[var(--color-border)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
            <input
              type="text"
              defaultValue={currentSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateQuery({ q: (e.target as HTMLInputElement).value, page: 1 });
                }
              }}
              placeholder="Buscar por código, comprador ou presenteado..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <select
            value={currentStatus}
            onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}
            className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs font-bold rounded-xl px-3 py-2.5 text-[var(--color-text-heading)] focus:outline-none cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="EXHAUSTED">Esgotados</option>
            <option value="EXPIRED">Expirados</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Vale-Presente</span>
        </button>
      </div>

      {/* TABELA DE VALES */}
      <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 text-[var(--color-text-subtle)] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Código do Vale</th>
                <th className="py-3.5 px-4">Saldo / Valor Original</th>
                <th className="py-3.5 px-4">Beneficiário / Comprador</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Validade</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {giftCardsResult.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">
                    Nenhum Gift Card encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                giftCardsResult.items.map((card) => {
                  const isExpanded = expandedCardId === card.id;

                  return (
                    <React.Fragment key={card.id}>
                      <tr className="hover:bg-[var(--color-bg-subtle)]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-[var(--color-primary)] tracking-wide bg-[var(--color-bg-subtle)] px-2.5 py-1 rounded-lg border border-[var(--color-border)]">
                              {card.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(card.code)}
                              className="p-1 text-[var(--color-text-subtle)] hover:text-[var(--color-text-heading)] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Copiar código"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-[var(--color-text-muted)] mt-1 block">
                            Emitido em {new Date(card.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-black text-sm text-[var(--color-text-heading)]">
                            {fmtCurrency(card.currentBalance)}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-subtle)]">
                            Original: {fmtCurrency(card.initialBalance)}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          {card.recipientName ? (
                            <p className="font-bold text-[var(--color-text-heading)]">
                              Para: {card.recipientName}
                            </p>
                          ) : (
                            <p className="text-[var(--color-text-muted)] italic">Ao Portador</p>
                          )}
                          {card.buyerName && (
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              De: {card.buyerName}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              card.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : card.status === "EXHAUSTED"
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {card.status === "ACTIVE"
                              ? "ATIVO"
                              : card.status === "EXHAUSTED"
                              ? "ESGOTADO"
                              : card.status === "EXPIRED"
                              ? "EXPIRADO"
                              : "CANCELADO"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[var(--color-text-muted)]">
                          {card.expiresAt
                            ? new Date(card.expiresAt).toLocaleDateString("pt-BR")
                            : "Sem expiração"}
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2">
                          {card.totalRedemptions > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
                              className="text-[11px] font-bold text-[var(--color-primary)] hover:underline cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>{card.totalRedemptions} resgate(s)</span>
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          )}

                          {card.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => handleCancelGiftCard(card.id)}
                              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* HISTÓRICO DE RESGATES EXPANDÍVEL */}
                      {isExpanded && card.redemptions.length > 0 && (
                        <tr className="bg-[var(--color-bg-subtle)]/60">
                          <td colSpan={6} className="p-4">
                            <div className="space-y-2">
                              <p className="text-[11px] font-bold text-[var(--color-text-heading)]">
                                Histórico de Utilização do Vale:
                              </p>
                              <div className="space-y-1">
                                {card.redemptions.map((red) => (
                                  <div
                                    key={red.id}
                                    className="flex items-center justify-between text-[11px] bg-white p-2.5 rounded-xl border border-[var(--color-border)]"
                                  >
                                    <span className="font-semibold text-emerald-700">
                                      - {fmtCurrency(red.amount)}
                                    </span>
                                    <span className="text-[var(--color-text-muted)]">
                                      {new Date(red.redeemedAt).toLocaleString("pt-BR")}
                                    </span>
                                    <span className="text-[var(--color-text-subtle)] italic">
                                      {red.notes || "Resgatado no agendamento"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO GLOBAL */}
        {giftCardsResult.total > 0 && (
          <div className="p-4 border-t border-[var(--color-border)]">
            <Pagination
              currentPage={giftCardsResult.page}
              totalItems={giftCardsResult.total}
              pageSize={giftCardsResult.pageSize}
              onPageChange={(page) => updateQuery({ page })}
              onPageSizeChange={(pageSize) => updateQuery({ pageSize, page: 1 })}
            />
          </div>
        )}
      </div>

      {/* MODAL EMITIR GIFT CARD MANUAL */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Emitir Novo Vale-Presente / Gift Card"
        >
          <form onSubmit={handleSaveGiftCard} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Valor ({currency}) *
                </label>
                <input
                  type="text"
                  required
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                  placeholder="150,00"
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Validade (dias)
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] focus:outline-none cursor-pointer"
                >
                  <option value="90">90 dias (3 meses)</option>
                  <option value="180">180 dias (6 meses)</option>
                  <option value="365">365 dias (1 ano)</option>
                  <option value="730">2 anos</option>
                  <option value="">Sem expiração</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Código Personalizado (opcional — deixe vazio para gerar automático)
              </label>
              <input
                type="text"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                placeholder="Ex: NATAL-2026-VIP ou ANIVERSARIO-MARIA"
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono uppercase"
              />
            </div>

            {/* Dados do Presenteado */}
            <div className="p-3.5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] space-y-3">
              <p className="font-extrabold text-[var(--color-text-heading)]">Beneficiário (Quem vai receber)</p>
              
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-text-subtle)] mb-1">
                    Nome do Presenteado
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Ex: Beatriz Lima"
                    className="w-full bg-white border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--color-text-subtle)] mb-1">
                    E-mail do Presenteado
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="beatriz@email.com"
                    className="w-full bg-white border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--color-text-subtle)] mb-1">
                  Mensagem de Presente
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: Feliz aniversário! Aproveite um dia incrível de cuidados."
                  className="w-full bg-white border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Dados do Comprador */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Nome do Comprador
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  E-mail do Comprador
                </label>
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="carlos@email.com"
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isPending ? "Emitindo..." : "Emitir Vale-Presente"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
