"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast-service";
import {
  ClipboardList,
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  DollarSign,
  CreditCard,
  Trash2,
  Users,
  Sparkles,
  Printer,
  Calendar,
  Gift,
  Award,
} from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { createPosSaleAction } from "@/server/actions/pos";
import type { PosBookingOption, PosDashboardStats, PosSaleSummary } from "@/server/queries/pos";

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
  const [isPending, startTransition] = useTransition();

  // Mode: "BOOKING" (fechar agendamento existente) | "WALK_IN" (venda avulsa)
  const [mode, setMode] = useState<"BOOKING" | "WALK_IN">("WALK_IN");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Cliente & Profissional da Comanda
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedProfId, setSelectedProfId] = useState<string>("");

  // Carrinho da Comanda
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("PIX");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Filtros de Produtos
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Modal de Recibo / Sucesso
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fmtCurrency = (val: number) =>
    val.toLocaleString(currency === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    });

  // Categorias únicas
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];

  // Produtos filtrados
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === "ALL" || p.category === selectedCategory;
    const s = productSearch.toLowerCase().trim();
    const matchSearch =
      !s ||
      p.name.toLowerCase().includes(s) ||
      (p.barcode && p.barcode.toLowerCase().includes(s)) ||
      (p.category && p.category.toLowerCase().includes(s));
    return matchCat && matchSearch;
  });

  // Totais do Carrinho
  const subtotal = cart.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
  const discountNum = discountAmount ? Math.max(0, parseFloat(discountAmount.replace(",", ".")) || 0) : 0;
  const total = Math.max(0, subtotal - discountNum);

  // Troco em Dinheiro
  const cashGivenNum = cashReceived ? parseFloat(cashReceived.replace(",", ".")) || 0 : 0;
  const changeAmount = paymentMethod === "CASH" ? Math.max(0, cashGivenNum - total) : 0;

  // Cálculo estimado de comissão
  const selectedProf = professionals.find((p) => p.id === selectedProfId);
  const estimatedCommission = cart.reduce((acc, it) => {
    if (!selectedProf) return 0;
    if (it.type === "PRODUCT" && selectedProf.productCommissionRate > 0) {
      return acc + it.quantity * it.unitPrice * (selectedProf.productCommissionRate / 100);
    }
    if (it.type === "SERVICE" && selectedProf.serviceCommissionRate > 0) {
      return acc + it.quantity * it.unitPrice * (selectedProf.serviceCommissionRate / 100);
    }
    return acc;
  }, 0);

  function handleSelectBooking(b: PosBookingOption) {
    setSelectedBookingId(b.id);
    setMode("BOOKING");
    setCustomerName(b.clientName);
    setCustomerPhone(b.clientPhone || "");
    setCustomerEmail(b.clientEmail || "");
    if (b.professionalId) {
      setSelectedProfId(b.professionalId);
    }

    // Carrega o serviço principal do agendamento no carrinho
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
      toast.error("Adicione ao menos um serviço ou produto à comanda.");
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
        toast.success("Venda finalizada com sucesso!");
        setCompletedSale(res.data);
        setIsReceiptOpen(true);
        handleResetToWalkIn();
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao finalizar venda.");
      }
    });
  }

  return (
    <div className="page-content space-y-8">
      {/* HEADER EXECUTIVO POS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-[var(--color-border)] shadow-xs relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-extrabold text-xs uppercase tracking-wider">
            <ClipboardList className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span>Frente de Caixa & Balcão</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CAIXA ABERTO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            Comanda Rápida & Venda POS
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] max-w-xl">
            Feche agendamentos do dia adicionando produtos consumidos no atendimento ou realize vendas diretas de balcão com baixa automática no estoque.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 z-10">
          <Link
            href={`/${companySlug}/produtos`}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
          >
            <Package className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Catálogo & Estoque</span>
          </Link>
        </div>
      </div>

      {/* KPI METRICS DO DIA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Total Faturado Hoje
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {fmtCurrency(stats.todaySalesTotal)}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            {stats.todaySalesCount} venda(s) realizada(s)
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Produtos Vendidos
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {fmtCurrency(stats.todayProductsTotal)}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Faturamento em itens físicos
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Serviços Concluídos
            </span>
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {fmtCurrency(stats.todayServicesTotal)}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Faturamento em atendimentos
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Comissões Lançadas
            </span>
            <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 shadow-2xs">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {fmtCurrency(stats.todayCommissionsTotal)}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Repasse aos profissionais hoje
          </p>
        </div>
      </div>

      {/* ÁREA PRINCIPAL DO POS: COLUNA ESQUERDA (CATÁLOGO & AGENDAMENTOS) + COLUNA DIREITA (COMANDA / CAIXA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA (7 colunas): AGENDAMENTOS DO DIA + CATÁLOGO RÁPIDO */}
        <div className="lg:col-span-7 space-y-6">
          {/* SELETOR DE MODO: AGENDAMENTOS DO DIA VS VENDA DIRETA */}
          <div className="bg-white p-5 rounded-3xl border border-[var(--color-border)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[var(--color-text-heading)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Agendamentos do Dia (Comandas Abertas)</span>
              </h2>
              {selectedBookingId && (
                <button
                  type="button"
                  onClick={handleResetToWalkIn}
                  className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                >
                  Limpar / Nova Venda Avulsa
                </button>
              )}
            </div>

            {openBookings.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] p-3 bg-[var(--color-bg-subtle)] rounded-2xl text-center">
                Nenhum agendamento pendente para hoje. Use a venda avulsa abaixo!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {openBookings.map((b) => {
                  const isSelected = selectedBookingId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBooking(b)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/20"
                          : "bg-[var(--color-bg-subtle)] border-[var(--color-border)] hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-[var(--color-text-heading)] truncate">
                          {b.clientName}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white border border-[var(--color-border)] font-mono">
                          {b.scheduledTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2 text-[11px]">
                        <span className="text-[var(--color-text-muted)] truncate">{b.serviceName}</span>
                        <span className="font-black text-[var(--color-text-heading)] shrink-0">
                          {fmtCurrency(b.servicePrice)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CATÁLOGO RÁPIDO DE PRODUTOS PARA ADICIONAR NA COMANDA */}
          <div className="bg-white p-5 rounded-3xl border border-[var(--color-border)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-black text-[var(--color-text-heading)] flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-500" />
                <span>Adicionar Produtos à Comanda</span>
              </h2>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* CATEGORIAS PILLS */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    selectedCategory === "ALL"
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] hover:bg-slate-200"
                  }`}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                      selectedCategory === cat
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* GRID DE PRODUTOS */}
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-6 text-center">
                Nenhum produto encontrado.
              </p>
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
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between group ${
                        isOutOfStock
                          ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                          : "bg-[var(--color-bg-subtle)] border-[var(--color-border)] hover:bg-white hover:border-[var(--color-primary)] hover:shadow-xs cursor-pointer active:scale-[0.98]"
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs text-[var(--color-text-heading)] line-clamp-2 leading-snug group-hover:text-[var(--color-primary)]">
                          {p.name}
                        </span>
                        {p.category && (
                          <span className="text-[10px] text-[var(--color-text-subtle)] block mt-0.5">
                            {p.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-[var(--color-border)]/60">
                        <span className="font-black text-xs text-[var(--color-text-heading)]">
                          {fmtCurrency(p.salePrice)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            isOutOfStock
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {p.stockQuantity} un
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA (5 colunas): A COMANDA / FRENTE DE CAIXA */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
            <div>
              <h2 className="text-base font-black text-[var(--color-text-heading)] flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[var(--color-primary)]" />
                <span>Comanda do Balcão</span>
              </h2>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {mode === "BOOKING" ? "Agendamento Vinculado" : "Venda Avulsa (Walk-in)"}
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
              >
                Esvaziar
              </button>
            )}
          </div>

          {/* DADOS DO CLIENTE & PROFISSIONAL */}
          <div className="space-y-3 bg-[var(--color-bg-subtle)] p-3.5 rounded-2xl border border-[var(--color-border)]">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-0.5">
                  Cliente
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-0.5">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(41) 99999-9999"
                  className="w-full bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-0.5">
                Profissional (Comissão)
              </label>
              <select
                value={selectedProfId}
                onChange={(e) => setSelectedProfId(e.target.value)}
                className="w-full bg-white border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[var(--color-text-heading)] focus:outline-none cursor-pointer"
              >
                <option value="">Nenhum / Estabelecimento Direto</option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name} (Prod: {prof.productCommissionRate}% | Serv: {prof.serviceCommissionRate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ITENS DA COMANDA */}
          <div className="space-y-2">
            <label className="block text-[11px] font-black text-[var(--color-text-heading)] uppercase tracking-wider">
              Itens da Comanda ({cart.length})
            </label>

            {cart.length === 0 ? (
              <div className="py-8 text-center bg-[var(--color-bg-subtle)] rounded-2xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                Nenhum item na comanda. Selecione um agendamento ou adicione produtos do catálogo.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.tempId}
                    className="p-3 bg-[var(--color-bg-subtle)] rounded-2xl border border-[var(--color-border)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-extrabold text-[var(--color-text-heading)] block truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-subtle)]">
                        {item.type === "PRODUCT" ? "Produto Físico" : "Serviço"} • {fmtCurrency(item.unitPrice)} un
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.tempId, -1)}
                        className="w-6 h-6 rounded-lg bg-white border border-[var(--color-border)] font-black text-xs flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono font-black text-xs px-1 min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.tempId, 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-[var(--color-border)] font-black text-xs flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right shrink-0 min-w-[65px]">
                      <span className="font-black text-xs text-[var(--color-text-heading)] block">
                        {fmtCurrency(item.quantity * item.unitPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.tempId)}
                        className="text-[10px] text-red-500 hover:underline cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FORMA DE PAGAMENTO */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            <label className="block text-[11px] font-black text-[var(--color-text-heading)] uppercase tracking-wider">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "PIX", label: "PIX" },
                { id: "CARD_CREDIT", label: "Crédito" },
                { id: "CARD_DEBIT", label: "Débito" },
                { id: "CASH", label: "Dinheiro" },
                { id: "GIFT_CARD", label: "Gift Card" },
                { id: "MEMBERSHIP", label: "Clube" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer text-center ${
                    paymentMethod === m.id
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs"
                      : "bg-[var(--color-bg-subtle)] text-[var(--color-text-heading)] border-[var(--color-border)] hover:bg-slate-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* SE DINHEIRO: CALCULADORA DE TROCO */}
            {paymentMethod === "CASH" && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 text-xs mt-2">
                <div>
                  <label className="block text-[10px] font-bold text-amber-900 uppercase">
                    Valor Recebido ({currency})
                  </label>
                  <input
                    type="text"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Ex: 100,00"
                    className="w-28 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-amber-800 font-bold block uppercase">Troco:</span>
                  <span className="text-sm font-black text-amber-900 font-mono">
                    {fmtCurrency(changeAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* DESCONTO & RESUMO FINANCEIRO */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border)] text-xs">
            <div className="flex items-center justify-between text-[var(--color-text-muted)]">
              <span>Subtotal:</span>
              <span className="font-mono font-bold">{fmtCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--color-text-muted)]">Desconto ({currency}):</span>
              <input
                type="text"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0,00"
                className="w-24 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-right text-xs font-mono font-bold focus:outline-none"
              />
            </div>

            {estimatedCommission > 0 && (
              <div className="flex items-center justify-between text-purple-700 bg-purple-50 p-2 rounded-xl border border-purple-100 text-[11px] font-bold">
                <span>Comissão {selectedProf?.name}:</span>
                <span className="font-mono">{fmtCurrency(estimatedCommission)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-base font-black text-[var(--color-text-heading)]">
              <span>Total a Cobrar:</span>
              <span className="text-xl text-[var(--color-primary)] font-mono">{fmtCurrency(total)}</span>
            </div>
          </div>

          {/* BOTÃO FINALIZAR VENDA */}
          <button
            type="button"
            disabled={isPending || cart.length === 0}
            onClick={handleFinalizeSale}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-md active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isPending ? "Processando Caixa..." : `Finalizar Venda (${fmtCurrency(total)})`}</span>
          </button>
        </div>
      </div>

      {/* MODAL DE RECIBO / VENDA CONCLUÍDA */}
      {isReceiptOpen && completedSale && (
        <Modal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          title="Recibo de Venda — Caixa Concluído"
        >
          <div className="space-y-4 text-xs">
            <div className="text-center py-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
              <h3 className="text-sm font-black text-emerald-900">Venda Registrada com Sucesso!</h3>
              <p className="text-[11px] text-emerald-700 font-mono">
                Comprovante #{completedSale.id.slice(-8).toUpperCase()}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 font-mono">
              <div className="flex justify-between font-bold text-[var(--color-text-heading)] border-b border-slate-200 pb-1">
                <span>{companyName}</span>
                <span>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {completedSale.customerName && (
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Cliente: {completedSale.customerName}
                </p>
              )}
              <div className="space-y-1 py-2 border-b border-slate-200">
                {completedSale.items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between text-[11px]">
                    <span>
                      {it.quantity}x {it.name}
                    </span>
                    <span>{fmtCurrency(Number(it.totalPrice))}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-sm text-[var(--color-text-heading)] pt-1">
                <span>TOTAL:</span>
                <span>{fmtCurrency(Number(completedSale.total))}</span>
              </div>
              <div className="flex justify-between text-[10px] text-[var(--color-text-muted)]">
                <span>Forma de Pagamento:</span>
                <span className="font-bold">{completedSale.paymentMethod}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Recibo</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-extrabold rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
