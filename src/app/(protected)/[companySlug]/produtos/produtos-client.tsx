"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "@/lib/toast-service";
import {
  Package,
  Plus,
  Search,
  Tag,
  Edit2,
  Trash2,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ClipboardList,
} from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  adjustStockAction,
} from "@/server/actions/products";
import type {
  ProductStats,
  ProductItem,
} from "@/server/queries/products";

type Props = {
  companySlug: string;
  companyName: string;
  currency: string;
  stats: ProductStats;
  productsResult: {
    items: ProductItem[];
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
  categories: string[];
  currentSearch: string;
  currentCategory: string;
  currentLowStockOnly: boolean;
};

export function ProdutosClient({
  companySlug,
  companyName,
  currency,
  stats,
  productsResult,
  categories,
  currentSearch,
  currentCategory,
  currentLowStockOnly,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<ProductItem | null>(null);
  const [stockActionType, setStockActionType] = useState<"IN" | "OUT">("IN");
  const [stockQty, setStockQty] = useState("5");
  const [stockReason, setStockReason] = useState("");

  // Form Produto
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [minStockThreshold, setMinStockThreshold] = useState("3");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const fmtCurrency = (val: number) =>
    val.toLocaleString(currency === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    });

  function updateQuery(updates: Record<string, string | number | boolean | null>) {
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
    setEditingProduct(null);
    setName("");
    setSku("");
    setBarcode("");
    setCostPrice("");
    setSalePrice("");
    setStockQuantity("10");
    setMinStockThreshold("3");
    setCategory("");
    setDescription("");
    setIsProductModalOpen(true);
  }

  function handleOpenEditModal(p: ProductItem) {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || "");
    setBarcode(p.barcode || "");
    setCostPrice(String(p.costPrice));
    setSalePrice(String(p.salePrice));
    setStockQuantity(String(p.stockQuantity));
    setMinStockThreshold(String(p.minStockThreshold));
    setCategory(p.category || "");
    setDescription(p.description || "");
    setIsProductModalOpen(true);
  }

  function handleOpenStockModal(p: ProductItem, type: "IN" | "OUT" = "IN") {
    setStockProduct(p);
    setStockActionType(type);
    setStockQty("5");
    setStockReason(type === "IN" ? "Compra de Reposição" : "Ajuste de Inventário");
    setIsStockModalOpen(true);
  }

  function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !salePrice) {
      toast.error("Nome e preço de venda são obrigatórios");
      return;
    }

    startTransition(async () => {
      const sale = parseFloat(salePrice.replace(",", "."));
      const cost = costPrice ? parseFloat(costPrice.replace(",", ".")) : 0;
      const initialQty = parseInt(stockQuantity, 10) || 0;
      const minThreshold = parseInt(minStockThreshold, 10) || 3;

      if (editingProduct) {
        const res = await updateProductAction(companySlug, editingProduct.id, {
          name,
          sku: sku || undefined,
          barcode: barcode || undefined,
          costPrice: cost,
          salePrice: sale,
          minStockThreshold: minThreshold,
          category: category || undefined,
          description: description || undefined,
        });

        if (res.success) {
          toast.success("Produto atualizado com sucesso!");
          setIsProductModalOpen(false);
          router.refresh();
        } else {
          toast.error(res.error || "Erro ao atualizar produto");
        }
      } else {
        const res = await createProductAction(companySlug, {
          name,
          sku: sku || undefined,
          barcode: barcode || undefined,
          costPrice: cost,
          salePrice: sale,
          stockQuantity: initialQty,
          minStockThreshold: minThreshold,
          category: category || undefined,
          description: description || undefined,
        });

        if (res.success) {
          toast.success("Produto cadastrado com sucesso!");
          setIsProductModalOpen(false);
          router.refresh();
        } else {
          toast.error(res.error || "Erro ao cadastrar produto");
        }
      }
    });
  }

  function handleDeleteProduct(id: string, prodName: string) {
    if (!confirm(`Deseja realmente excluir o produto "${prodName}"?`)) return;

    startTransition(async () => {
      const res = await deleteProductAction(companySlug, id);
      if (res.success) {
        toast.success("Produto removido do catálogo.");
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao remover produto");
      }
    });
  }

  function handleSaveStockAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!stockProduct) return;

    startTransition(async () => {
      const qtyNum = parseInt(stockQty, 10) || 0;
      const res = await adjustStockAction(companySlug, stockProduct.id, {
        type: stockActionType,
        quantity: qtyNum,
        reason: stockReason,
      });

      if (res.success) {
        toast.success(`Estoque atualizado! Novo saldo: ${res.newStock} unidades.`);
        setIsStockModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao atualizar estoque");
      }
    });
  }

  return (
    <div className="page-content space-y-8">
      {/* HEADER EXECUTIVO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-[var(--color-border)] shadow-xs relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-extrabold text-xs uppercase tracking-wider">
            <Package className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Varejo & Operações</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ESTOQUE ATIVO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            Produtos Físicos & Controle de Estoque
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] max-w-xl">
            Gerencie itens para revenda (pomadas, shampoos, óleos, produtos estéticos) com controle de saldo e alertas.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 z-10">
          <Link
            href={`/${companySlug}/pos`}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
          >
            <ClipboardList className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Frente de Caixa (POS)</span>
          </Link>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98] text-white rounded-xl transition-all font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-[var(--shadow-primary)]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Total no Catálogo
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {stats.totalProducts}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            {stats.totalStockUnits} unidade(s) física(s) em estoque
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Valor do Estoque (Venda)
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {fmtCurrency(stats.totalStockSaleValue)}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Custo: {fmtCurrency(stats.totalStockCostValue)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Alerta de Reposição
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {stats.lowStockCount}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Item(ns) com estoque baixo ou zerado
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Margem Potencial
            </span>
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {fmtCurrency(Math.max(0, stats.totalStockSaleValue - stats.totalStockCostValue))}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Lucro bruto projetado no estoque
          </p>
        </div>
      </div>

      {/* BARRA DE FILTROS & AÇÕES */}
      <div className="bg-white rounded-3xl border border-[var(--color-border)] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
            <input
              type="text"
              defaultValue={currentSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateQuery({ q: (e.target as HTMLInputElement).value, page: 1 });
                }
              }}
              placeholder="Buscar por nome, SKU, código de barras..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {categories.length > 0 && (
            <select
              value={currentCategory}
              onChange={(e) => updateQuery({ category: e.target.value, page: 1 })}
              className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs font-bold rounded-xl px-3 py-2.5 text-[var(--color-text-heading)] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => updateQuery({ lowStock: !currentLowStockOnly, page: 1 })}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
              currentLowStockOnly
                ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                : "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-slate-100"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Apenas Estoque Baixo</span>
          </button>
        </div>
      </div>

      {/* TABELA DE PRODUTOS */}
      <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 text-[var(--color-text-subtle)] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Produto / Categoria</th>
                <th className="py-3.5 px-4">Preço de Venda</th>
                <th className="py-3.5 px-4">Custo</th>
                <th className="py-3.5 px-4">Estoque Atual</th>
                <th className="py-3.5 px-4">Vendas Realizadas</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {productsResult.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">
                    Nenhum produto cadastrado no catálogo.
                  </td>
                </tr>
              ) : (
                productsResult.items.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-bg-subtle)]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-extrabold text-[var(--color-text-heading)]">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--color-text-subtle)]">
                        {p.category && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] font-semibold">
                            {p.category}
                          </span>
                        )}
                        {p.sku && <span>SKU: {p.sku}</span>}
                        {p.barcode && <span>EAN: {p.barcode}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-black text-sm text-[var(--color-text-heading)]">
                      {fmtCurrency(p.salePrice)}
                    </td>

                    <td className="py-3.5 px-4 text-[var(--color-text-muted)] font-medium">
                      {fmtCurrency(p.costPrice)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black text-sm px-2.5 py-0.5 rounded-lg border font-mono ${
                            p.isLowStock
                              ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {p.stockQuantity} un
                        </span>
                        {p.isLowStock && (
                          <span className="text-[10px] text-red-600 font-bold">Repor!</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--color-text-subtle)] block mt-0.5">
                        Mínimo: {p.minStockThreshold} un
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[var(--color-text-muted)]">
                      {p.totalSold} saída(s)
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenStockModal(p, "IN")}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                        title="Adicionar entrada de estoque"
                      >
                        + Entrada
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenStockModal(p, "OUT")}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg transition-colors cursor-pointer text-[11px]"
                        title="Ajustar saída de estoque"
                      >
                        - Saída
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1.5 text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar produto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id, p.name)}
                        className="p-1.5 text-[var(--color-text-subtle)] hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Excluir produto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO GLOBAL */}
        {productsResult.total > 0 && (
          <div className="p-4 border-t border-[var(--color-border)]">
            <Pagination
              currentPage={productsResult.page}
              totalItems={productsResult.total}
              pageSize={productsResult.pageSize}
              onPageChange={(page) => updateQuery({ page })}
              onPageSizeChange={(pageSize) => updateQuery({ pageSize, page: 1 })}
            />
          </div>
        )}
      </div>

      {/* MODAL CADASTRAR / EDITAR PRODUTO */}
      {isProductModalOpen && (
        <Modal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title={editingProduct ? "Editar Produto" : "Cadastrar Novo Produto"}
        >
          <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pomada Efeito Matte 150g"
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Preço de Venda ({currency}) *
                </label>
                <input
                  type="text"
                  required
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="45,00"
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Preço de Custo ({currency})
                </label>
                <input
                  type="text"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="22,50"
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {!editingProduct && (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                    Estoque Inicial (unidades)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Estoque Mínimo (Alerta)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minStockThreshold}
                  onChange={(e) => setMinStockThreshold(e.target.value)}
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Cabelo, Barba, Cosméticos"
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Código SKU / Referência
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ex: POM-MATTE-01"
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Descrição (opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Fixação forte com brilho natural para penteados clássicos."
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar Produto"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL ENTRADA / SAÍDA DE ESTOQUE */}
      {isStockModalOpen && stockProduct && (
        <Modal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          title={`Movimentação de Estoque — ${stockProduct.name}`}
        >
          <form onSubmit={handleSaveStockAdjustment} className="space-y-4 text-xs">
            <div className="p-3 bg-[var(--color-bg-subtle)] rounded-xl border border-[var(--color-border)] flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">Estoque Atual:</span>
              <strong className="text-sm font-black text-[var(--color-text-heading)] font-mono">
                {stockProduct.stockQuantity} un
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Tipo de Movimentação
                </label>
                <select
                  value={stockActionType}
                  onChange={(e) => setStockActionType(e.target.value as "IN" | "OUT")}
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-heading)] focus:outline-none cursor-pointer font-bold"
                >
                  <option value="IN">+ Entrada (Reposição / Compra)</option>
                  <option value="OUT">- Saída (Ajuste / Quebra / Perda)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Quantidade *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm font-black text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Motivo / Justificativa
              </label>
              <input
                type="text"
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="Ex: Compra fornecedor NF 1234 / Produto danificado"
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Confirmar Movimentação"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
