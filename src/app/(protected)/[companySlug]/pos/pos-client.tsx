"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import { toast } from "@/lib/toast-service";
import {
  ClipboardList,
  Package,
  Search,
  CheckCircle2,
  DollarSign,
  Award,
  Printer,
  Calendar,
  X,
} from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { createPosSaleAction } from "@/server/actions/pos";
import type {
  PosBookingOption,
  PosDashboardStats,
  PosSaleSummary,
} from "@/server/queries/pos";

type PosProductItem = {
  id: string;
  name: string;
  salePrice: number;
  stockQuantity: number;
  category: string | null;
  barcode: string | null;
};

type ProfessionalOption = {
  id: string;
  name: string;
  productCommissionRate: number;
  serviceCommissionRate: number;
};

type CartItem = {
  tempId: string;
  type: "PRODUCT" | "SERVICE" | "FEE";
  productId?: string;
  serviceId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

/** Só o que a tela do recibo realmente usa — sem `any`. */
type CompletedSale = {
  id: string;
  customerName: string | null;
  total: number;
  paymentMethod: string;
  items: { id: string; name: string; quantity: number; totalPrice: number }[];
};

type Props = {
  companySlug: string;
  companyName: string;
  currency: string;
  openBookings: PosBookingOption[];
  products: PosProductItem[];
  stats: PosDashboardStats;
  recentSales: { items: PosSaleSummary[]; total: number };
  professionals: ProfessionalOption[];
};

const PAYMENT_LABELS: Record<string, string> = {
  PIX: "PIX",
  CARD_CREDIT: "Crédito",
  CARD_DEBIT: "Débito",
  CASH: "Dinheiro",
  GIFT_CARD: "Gift card",
  MEMBERSHIP: "Clube",
};

export function PosClient({
  companySlug,
  companyName,
  currency,
  openBookings,
  products,
  stats,
  recentSales,
  professionals,
}: Props) {
  const router = useRouter();
  const company = useCompany();
  const [isPending, startTransition] = useTransition();

  // PIX é meio de pagamento brasileiro. Numa empresa que opera em outra moeda
  // ele não deve nem aparecer no caixa — antes era oferecido a todo mundo.
  const paymentOptions = useMemo(() => {
    const ids = ["CARD_CREDIT", "CARD_DEBIT", "CASH", "GIFT_CARD", "MEMBERSHIP"];
    if (currency === "BRL") ids.unshift("PIX");
    return ids.map((id) => ({ id, label: PAYMENT_LABELS[id] }));
  }, [currency]);

  const [mode, setMode] = useState<"BOOKING" | "WALK_IN">("WALK_IN");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedProfId, setSelectedProfId] = useState<string>("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>(
    currency === "BRL" ? "PIX" : "CARD_CREDIT"
  );
  const [cashReceived, setCashReceived] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const money = (val: number) => formatMoney(val, company.currency, company.locale);

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ) as string[];

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === "ALL" || p.category === selectedCategory;
    const s = productSearch.toLowerCase().trim();
    const matchSearch =
      !s ||
      p.name.toLowerCase().includes(s) ||
      (p.barcode ? p.barcode.toLowerCase().includes(s) : false) ||
      (p.category ? p.category.toLowerCase().includes(s) : false);
    return matchCat && matchSearch;
  });

  const subtotal = cart.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  const rawDiscount = discountAmount
    ? Math.max(0, parseFloat(discountAmount.replace(",", ".")) || 0)
    : 0;
  const discountNum = Math.min(rawDiscount, subtotal);
  const discountExceedsSubtotal = rawDiscount > subtotal && subtotal > 0;
  const total = subtotal - discountNum;

  const cashGivenNum = cashReceived
    ? parseFloat(cashReceived.replace(",", ".")) || 0
    : 0;
  const isCash = paymentMethod === "CASH";
  const cashIsShort = isCash && cashReceived.trim() !== "" && cashGivenNum < total;
  const changeAmount = isCash ? Math.max(0, cashGivenNum - total) : 0;

  const selectedProf = professionals.find((p) => p.id === selectedProfId);
  const estimatedCommission = selectedProf
    ? cart.reduce((acc, it) => {
        if (it.type === "PRODUCT" && selectedProf.productCommissionRate > 0) {
          return acc + it.quantity * it.unitPrice * (selectedProf.productCommissionRate / 100);
        }
        if (it.type === "SERVICE" && selectedProf.serviceCommissionRate > 0) {
          return acc + it.quantity * it.unitPrice * (selectedProf.serviceCommissionRate / 100);
        }
        return acc;
      }, 0)
    : 0;

  function handleSelectBooking(b: PosBookingOption) {
    setSelectedBookingId(b.id);
    setMode("BOOKING");
    setCustomerName(b.clientName);
    setCustomerPhone(b.clientPhone || "");
    setCustomerEmail(b.clientEmail || "");
    if (b.professionalId) setSelectedProfId(b.professionalId);

    setCart([
      {
        tempId: `serv_${b.id}`,
        type: "SERVICE",
        name: b.serviceName,
        quantity: 1,
        unitPrice: b.servicePrice,
      },
    ]);
  }

  function handleResetToWalkIn() {
    setSelectedBookingId(null);
    setMode("WALK_IN");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setSelectedProfId("");
    setCart([]);
    setDiscountAmount("");
    setCashReceived("");
    setNotes("");
  }

  function handleAddProduct(p: PosProductItem) {
    setCart((prev) => {
      const existing = prev.find((it) => it.productId === p.id);
      if (existing) {
        return prev.map((it) =>
          it.productId === p.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          tempId: `prod_${p.id}_${Date.now()}`,
          type: "PRODUCT",
          productId: p.id,
          name: p.name,
          quantity: 1,
          unitPrice: p.salePrice,
        },
      ];
    });
  }

  function handleUpdateQuantity(tempId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.tempId === tempId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[]
    );
  }

  function handleRemoveItem(tempId: string) {
    setCart((prev) => prev.filter((it) => it.tempId !== tempId));
  }

  function handleFinalizeSale() {
    if (cart.length === 0) {
      toast.error("Comanda vazia", "Adicione ao menos um serviço ou produto.");
      return;
    }

    startTransition(async () => {
      const res = await createPosSaleAction(companySlug, {
        bookingId: selectedBookingId,
        professionalId: selectedProfId || undefined,
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        items: cart.map((it) => ({
          type: it.type,
          productId: it.productId,
          serviceId: it.serviceId,
          name: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        discountAmount: discountNum,
        paymentMethod,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.data) {
        const sale = res.data;
        toast.success("Venda registrada", `Total de ${money(Number(sale.total))}.`);
        setCompletedSale({
          id: sale.id,
          customerName: sale.customerName ?? null,
          total: Number(sale.total),
          paymentMethod: sale.paymentMethod,
          items: sale.items.map((it) => ({
            id: it.id,
            name: it.name,
            quantity: it.quantity,
            totalPrice: Number(it.totalPrice),
          })),
        });
        setIsReceiptOpen(true);
        handleResetToWalkIn();
        router.refresh();
      } else {
        toast.error("Não foi possível fechar", res.error || "Erro ao registrar a venda.");
      }
    });
  }

  return (
    <div className="page-container pb-20">
      <div className="page-content space-y-6">
        <PageHeader
          category="Caixa"
          categoryIcon={<ClipboardList className="w-3.5 h-3.5" />}
          title="Frente de caixa"
          description="Feche um agendamento do dia ou registre uma venda de balcão. Produtos dão baixa no estoque na hora."
          action={
            <Link
              href={`/${companySlug}/produtos`}
              className="btn btn-outline btn-sm inline-flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Produtos e estoque</span>
            </Link>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <span className="stat-card-label">Faturado hoje</span>
            <span className="stat-card-value">{money(stats.todaySalesTotal)}</span>
            <span className="stat-card-delta">
              <DollarSign className="w-3 h-3 inline-block mr-1 align-[-1px]" />
              {stats.todaySalesCount} {stats.todaySalesCount === 1 ? "venda" : "vendas"}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Produtos</span>
            <span className="stat-card-value">{money(stats.todayProductsTotal)}</span>
            <span className="stat-card-delta">
              <Package className="w-3 h-3 inline-block mr-1 align-[-1px]" />
              itens físicos vendidos hoje
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Serviços</span>
            <span className="stat-card-value">{money(stats.todayServicesTotal)}</span>
            <span className="stat-card-delta">
              <ClipboardList className="w-3 h-3 inline-block mr-1 align-[-1px]" />
              atendimentos fechados hoje
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Comissões</span>
            <span className="stat-card-value">{money(stats.todayCommissionsTotal)}</span>
            <span className="stat-card-delta">
              <Award className="w-3 h-3 inline-block mr-1 align-[-1px]" />
              a repassar aos profissionais
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Esquerda: de onde a comanda vem ── */}
          <div className="lg:col-span-7 space-y-6">
            <div className="card">
              <div className="card-header">
                <span className="card-title flex items-center gap-2" style={{ fontSize: "var(--text-md)" }}>
                  <Calendar className="w-4 h-4 text-[var(--color-text-subtle)]" />
                  <span>Agendamentos de hoje</span>
                </span>
                <div className="segmented" role="tablist" aria-label="Origem da comanda">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "WALK_IN"}
                    data-active={mode === "WALK_IN"}
                    onClick={handleResetToWalkIn}
                    className="segmented-item"
                  >
                    Avulsa
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "BOOKING"}
                    data-active={mode === "BOOKING"}
                    disabled={openBookings.length === 0}
                    onClick={() => setMode("BOOKING")}
                    className="segmented-item disabled:opacity-50"
                  >
                    Agendamento
                  </button>
                </div>
              </div>

              <div className="card-body">
                {openBookings.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="w-5 h-5" />}
                    title="Nenhum atendimento pendente hoje"
                    description="Quando houver agendamentos do dia ainda em aberto, eles aparecem aqui para fechar em um clique. Enquanto isso, registre a venda como avulsa."
                  />
                ) : (
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1"
                    role="listbox"
                    aria-label="Agendamentos abertos"
                  >
                    {openBookings.map((b) => {
                      const isSelected = selectedBookingId === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectBooking(b)}
                          className={`p-3 rounded-[var(--radius-card)] border text-left transition-colors flex flex-col gap-2 ${
                            isSelected
                              ? "bg-[var(--color-primary-light)] border-[var(--color-primary)]"
                              : "bg-[var(--color-bg-subtle)] border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-medium text-[var(--color-text-heading)] truncate" style={{ fontSize: "var(--text-sm)" }}>
                              {b.clientName}
                            </span>
                            <span className="eyebrow shrink-0">{b.scheduledTime}</span>
                          </span>
                          <span className="flex items-center justify-between gap-2" style={{ fontSize: "var(--text-xs)" }}>
                            <span className="text-[var(--color-text-muted)] truncate">
                              {b.serviceName}
                            </span>
                            <span className="font-medium text-[var(--color-text-heading)] shrink-0 tabular-nums">
                              {money(b.servicePrice)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title flex items-center gap-2" style={{ fontSize: "var(--text-md)" }}>
                  <Package className="w-4 h-4 text-[var(--color-text-subtle)]" />
                  <span>Produtos</span>
                </span>
                <div className="relative w-full max-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Nome ou código de barras"
                    aria-label="Buscar produto"
                    className="input pl-9"
                    style={{ paddingBlock: "0.4rem", fontSize: "var(--text-xs)" }}
                  />
                </div>
              </div>

              {categories.length > 0 && (
                <div className="px-5 pt-4 scroller">
                  <div className="segmented w-max" role="tablist" aria-label="Filtrar por categoria">
                    {[{ id: "ALL", label: "Todas" }, ...categories.map((c) => ({ id: c, label: c }))].map(
                      (cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          role="tab"
                          aria-selected={selectedCategory === cat.id}
                          data-active={selectedCategory === cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className="segmented-item whitespace-nowrap"
                        >
                          {cat.label}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="card-body">
                {filteredProducts.length === 0 ? (
                  <EmptyState
                    icon={<Package className="w-5 h-5" />}
                    title={
                      products.length === 0
                        ? "Nenhum produto cadastrado"
                        : "Nenhum produto com esse filtro"
                    }
                    description={
                      products.length === 0
                        ? "Cadastre produtos para vendê-los no balcão com baixa automática de estoque."
                        : "Ajuste a busca ou escolha outra categoria."
                    }
                    action={
                      products.length === 0 ? (
                        <Link
                          href={`/${companySlug}/produtos`}
                          className="btn btn-primary btn-sm"
                        >
                          Cadastrar produto
                        </Link>
                      ) : undefined
                    }
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                    {filteredProducts.map((p) => {
                      const isOutOfStock = p.stockQuantity <= 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddProduct(p)}
                          aria-label={`Adicionar ${p.name} à comanda`}
                          className="p-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-left transition-colors flex flex-col justify-between gap-3 enabled:hover:border-[var(--color-primary)] disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                          <span className="min-w-0">
                            <span
                              className="font-medium text-[var(--color-text-heading)] line-clamp-2 leading-snug block"
                              style={{ fontSize: "var(--text-sm)" }}
                            >
                              {p.name}
                            </span>
                            {p.category && (
                              <span className="eyebrow block mt-0.5">{p.category}</span>
                            )}
                          </span>

                          <span className="flex items-center justify-between gap-1 pt-2 border-t border-[var(--color-border)]">
                            <span className="font-medium text-[var(--color-text-heading)] tabular-nums" style={{ fontSize: "var(--text-sm)" }}>
                              {money(p.salePrice)}
                            </span>
                            <span
                              className={`badge ${isOutOfStock ? "badge-danger" : "badge-neutral"}`}
                            >
                              {isOutOfStock ? "sem estoque" : `${p.stockQuantity} un`}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Direita: a comanda ── */}
          <div className="lg:col-span-5 card card-lg lg:sticky lg:top-4">
            <div className="card-header">
              <div className="min-w-0">
                <h2 className="card-title">Comanda</h2>
                <p className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-xs)" }}>
                  {mode === "BOOKING" ? "Fechando um agendamento" : "Venda de balcão"}
                </p>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetToWalkIn}
                  className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            <div className="card-body space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="input-label" htmlFor="pos-customer">
                    Cliente
                  </label>
                  <input
                    id="pos-customer"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Opcional"
                    className="input"
                  />
                </div>

                <div className="field">
                  <label className="input-label" htmlFor="pos-phone">
                    Telefone
                  </label>
                  <input
                    id="pos-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Opcional"
                    className="input"
                  />
                </div>
              </div>

              <div className="field">
                <label className="input-label" htmlFor="pos-professional">
                  Profissional
                </label>
                <select
                  id="pos-professional"
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                  className="input"
                >
                  <option value="">Sem comissão</option>
                  {professionals.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.name} — produtos {prof.productCommissionRate}% / serviços{" "}
                      {prof.serviceCommissionRate}%
                    </option>
                  ))}
                </select>
                <span className="input-hint">
                  Define quem recebe a comissão desta venda.
                </span>
              </div>

              {/* A observação já era enviada para a action e gravada na venda,
                  mas a tela nunca ofereceu onde escrevê-la. */}
              <div className="field">
                <label className="input-label" htmlFor="pos-notes">
                  Observação
                </label>
                <textarea
                  id="pos-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Fica registrada no comprovante interno"
                  className="input resize-y"
                />
              </div>

              <div className="space-y-2">
                <span className="eyebrow">Itens ({cart.length})</span>

                {cart.length === 0 ? (
                  <p
                    className="py-6 px-4 text-center text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)]"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    Escolha um agendamento ou toque num produto para começar.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <li
                        key={item.tempId}
                        className="p-3 bg-[var(--color-bg-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border)] flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <span
                            className="font-medium text-[var(--color-text-heading)] block truncate"
                            style={{ fontSize: "var(--text-sm)" }}
                          >
                            {item.name}
                          </span>
                          <span
                            className="text-[var(--color-text-subtle)]"
                            style={{ fontSize: "var(--text-xs)" }}
                          >
                            {item.type === "PRODUCT" ? "Produto" : "Serviço"} ·{" "}
                            {money(item.unitPrice)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.tempId, -1)}
                            className="btn btn-outline btn-icon btn-sm"
                            aria-label={`Diminuir quantidade de ${item.name}`}
                          >
                            −
                          </button>
                          <span
                            className="font-mono tabular-nums min-w-[1.75rem] text-center text-[var(--color-text-heading)]"
                            style={{ fontSize: "var(--text-sm)" }}
                            aria-label={`Quantidade: ${item.quantity}`}
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.tempId, 1)}
                            className="btn btn-outline btn-icon btn-sm"
                            aria-label={`Aumentar quantidade de ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className="font-mono tabular-nums font-medium text-[var(--color-text-heading)] block"
                            style={{ fontSize: "var(--text-sm)" }}
                          >
                            {money(item.quantity * item.unitPrice)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.tempId)}
                            className="text-[var(--color-danger)] hover:underline"
                            style={{ fontSize: "var(--text-xs)" }}
                          >
                            Remover
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="eyebrow mb-2">Forma de pagamento</legend>
                <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Forma de pagamento">
                  {paymentOptions.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`btn btn-sm ${
                        paymentMethod === m.id ? "btn-secondary" : "btn-outline"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {isCash && (
                  <div className="pt-2 space-y-2">
                    <div className="field">
                      <label className="input-label" htmlFor="pos-cash">
                        Valor recebido
                      </label>
                      <input
                        id="pos-cash"
                        type="text"
                        inputMode="decimal"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="0,00"
                        aria-invalid={cashIsShort}
                        className="input font-mono"
                      />
                    </div>
                    {/* Antes o troco era travado em zero quando o valor recebido
                        era menor que o total, sem dizer nada — o operador via
                        "Troco: 0,00" e concluía que estava tudo certo. */}
                    {cashIsShort ? (
                      <p className="alert alert-warning">
                        Faltam {money(total - cashGivenNum)} para cobrir o total.
                      </p>
                    ) : (
                      <p
                        className="flex items-center justify-between text-[var(--color-text)]"
                        style={{ fontSize: "var(--text-sm)" }}
                      >
                        <span>Troco</span>
                        <span className="font-mono tabular-nums font-medium text-[var(--color-text-heading)]">
                          {money(changeAmount)}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </fieldset>

              <div className="space-y-2 pt-1 border-t border-[var(--color-border)]">
                <p
                  className="flex items-center justify-between text-[var(--color-text-muted)] pt-3"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{money(subtotal)}</span>
                </p>

                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="pos-discount"
                    className="text-[var(--color-text-muted)]"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    Desconto
                  </label>
                  <input
                    id="pos-discount"
                    type="text"
                    inputMode="decimal"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="0,00"
                    aria-invalid={discountExceedsSubtotal}
                    className="input font-mono text-right w-28"
                    style={{ paddingBlock: "0.35rem" }}
                  />
                </div>
                {discountExceedsSubtotal && (
                  <p className="input-error">
                    Desconto maior que o subtotal — aplicado {money(discountNum)}.
                  </p>
                )}

                {estimatedCommission > 0 && (
                  <p
                    className="flex items-center justify-between text-[var(--color-text-muted)]"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    <span>Comissão de {selectedProf?.name}</span>
                    <span className="font-mono tabular-nums">
                      {money(estimatedCommission)}
                    </span>
                  </p>
                )}

                <p className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                  <span className="font-medium text-[var(--color-text-heading)]">Total</span>
                  <span className="stat-card-value font-mono">{money(total)}</span>
                </p>
              </div>

              <button
                type="button"
                disabled={isPending || cart.length === 0}
                onClick={handleFinalizeSale}
                className="btn btn-primary btn-lg w-full inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isPending ? "Registrando…" : `Fechar venda · ${money(total)}`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Últimas vendas: já vinham do servidor e a tela simplesmente não as
            mostrava — a consulta era paga e jogada fora. */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Últimas vendas
            </h2>
            {recentSales.total > recentSales.items.length && (
              <span className="text-[var(--color-text-muted)] tabular-nums" style={{ fontSize: "var(--text-xs)" }}>
                {recentSales.items.length} de {recentSales.total}
              </span>
            )}
          </div>

          {recentSales.items.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="w-5 h-5" />}
              title="Nenhuma venda registrada ainda"
              description="Assim que a primeira comanda for fechada, ela aparece aqui com itens, forma de pagamento e total."
            />
          ) : (
            <div
              className="table-container"
              style={{ border: 0, borderRadius: "0 0 var(--radius-card) var(--radius-card)", boxShadow: "none" }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>Comprovante</th>
                    <th>Cliente</th>
                    <th className="text-right">Itens</th>
                    <th>Pagamento</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.items.map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <span className="font-mono text-[var(--color-text-heading)]">
                          #{sale.id.slice(-8).toUpperCase()}
                        </span>
                        <span
                          className="block text-[var(--color-text-subtle)]"
                          style={{ fontSize: "var(--text-xs)" }}
                        >
                          {new Date(sale.createdAt).toLocaleString(company.locale, {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td>{sale.customerName || "—"}</td>
                      <td data-type="number">{sale.itemsCount}</td>
                      <td>
                        <span className="badge badge-neutral">
                          {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                        </span>
                      </td>
                      <td data-type="number">{money(sale.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isReceiptOpen && completedSale && (
        <Modal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          title="Venda registrada"
        >
          <div className="space-y-4">
            <div className="card card-body space-y-2 font-mono">
              <div className="flex justify-between items-baseline pb-2 border-b border-[var(--color-border)]">
                <span className="font-medium text-[var(--color-text-heading)]">
                  {companyName}
                </span>
                <span className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-xs)" }}>
                  {new Date().toLocaleString(company.locale, {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-xs)" }}>
                Comprovante #{completedSale.id.slice(-8).toUpperCase()}
                {completedSale.customerName ? ` · ${completedSale.customerName}` : ""}
              </p>

              <ul className="space-y-1 py-2 border-b border-[var(--color-border)]">
                {completedSale.items.map((it) => (
                  <li
                    key={it.id}
                    className="flex justify-between gap-3"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    <span className="truncate">
                      {it.quantity}× {it.name}
                    </span>
                    <span className="tabular-nums shrink-0">{money(it.totalPrice)}</span>
                  </li>
                ))}
              </ul>

              <p className="flex justify-between font-medium text-[var(--color-text-heading)]">
                <span>Total</span>
                <span className="tabular-nums">{money(completedSale.total)}</span>
              </p>
              <p
                className="flex justify-between text-[var(--color-text-muted)]"
                style={{ fontSize: "var(--text-xs)" }}
              >
                <span>Pagamento</span>
                <span>
                  {PAYMENT_LABELS[completedSale.paymentMethod] ?? completedSale.paymentMethod}
                </span>
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-outline btn-sm inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                className="btn btn-primary btn-sm"
              >
                Concluir
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
