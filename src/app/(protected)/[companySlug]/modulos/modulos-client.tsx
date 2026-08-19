"use client";

import React, { useState, useTransition } from "react";
import { type SystemModule } from "@/server/actions/admin-modules";
import { toast } from "@/lib/toast-service";
import { Tag, CheckCircle2, ShoppingCart, CreditCard, Lock, Sparkles, Star } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  modules: SystemModule[];
  activeModuleCodes: string[];
};

export function CompanyModulosClient({ companySlug, modules, activeModuleCodes }: Props) {
  const [cart, setCart] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "LIFETIME">("MONTHLY");
  const [isPending, startTransition] = useTransition();

  const fmtCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function toggleCartItem(moduleCode: string) {
    if (activeModuleCodes.includes(moduleCode)) return;

    if (cart.includes(moduleCode)) {
      setCart(cart.filter((c) => c !== moduleCode));
    } else {
      setCart([...cart, moduleCode]);
    }
  }

  const selectedModules = modules.filter((m) => cart.includes(m.code));
  const cartTotal = selectedModules.reduce((acc, m) => {
    if (billingCycle === "LIFETIME" && m.lifetimePrice > 0) return acc + m.lifetimePrice;
    return acc + m.monthlyPrice;
  }, 0);

  function handleCheckoutStripe() {
    if (cart.length === 0) {
      toast.warning("Carrinho Vazio", "Selecione ao menos 1 módulo para contratar.");
      return;
    }

    startTransition(async () => {
      // Simulação de Checkout do Stripe para Ativação Instantânea do Add-on
      toast.success("Pagamento Confirmado!", "Os módulos contratados foram ativados com sucesso na sua conta.");
      setCart([]);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    });
  }

  return (
    <div className="w-full px-6 sm:px-10 py-8 text-left space-y-8 pb-32">
      {/* Header da Loja */}
      <div>
        <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
          <Tag className="w-4 h-4" />
          <span>App Marketplace</span>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-heading)] tracking-tight mt-1">
          Módulos & Add-ons
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Turbine a operação do seu negócio com ferramentas avançadas. Ativação instantânea no seu painel.
        </p>
      </div>

      {/* VITRINE DE MÓDULOS E ADD-ONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((m) => {
          const isOwned = activeModuleCodes.includes(m.code);
          const inCart = cart.includes(m.code);

          return (
            <div
              key={m.id}
              className={`bg-[var(--color-bg)] rounded-[var(--radius-panel)] border transition-all p-6 space-y-4 shadow-2xs relative flex flex-col justify-between ${
                isOwned
                  ? "border-[var(--color-success-border)] bg-[var(--color-success-light)]"
                  : inCart
                  ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] shadow-md"
                  : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[var(--text-2xs)] font-semibold uppercase tracking-wider bg-[var(--color-bg-muted)] text-[var(--color-text)] px-2.5 py-1 rounded-[var(--radius-control)]">
                    {m.category}
                  </span>
                  {isOwned ? (
                    <span className="text-[var(--text-2xs)] font-bold bg-[var(--color-success-light)] text-[var(--color-success)] px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                    </span>
                  ) : inCart ? (
                    <span className="text-[var(--text-2xs)] font-bold bg-[var(--color-primary-light)] text-[var(--color-primary)] px-3 py-1 rounded-full">
                      No Carrinho
                    </span>
                  ) : null}
                </div>

                <h3 className="text-base font-semibold text-[var(--color-text-heading)]">{m.name}</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">{m.description}</p>
              </div>

              <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-subtle)] font-bold uppercase text-[var(--text-2xs)]">Investimento</span>
                  <span className="text-base font-semibold text-[var(--color-text-heading)]">
                    {m.monthlyPrice > 0 ? `${fmtCurrency(m.monthlyPrice)}/mês` : fmtCurrency(m.lifetimePrice)}
                  </span>
                </div>

                {!isOwned ? (
                  <button
                    type="button"
                    onClick={() => toggleCartItem(m.code)}
                    className={`w-full py-2.5 rounded-[var(--radius-control)] font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      inCart
                        ? "bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                        : "bg-[#635bff] hover:bg-[#544dc9] text-white shadow-xs"
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{inCart ? "Remover do Carrinho" : "Adicionar ao Carrinho"}</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-[var(--radius-control)] font-bold text-xs bg-[var(--color-success-light)] text-[var(--color-success)] cursor-default flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Módulo Desbloqueado</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BARRA FIXA DO CARRINHO DE COMPRAS & CHECKOUT STRIPE */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--color-navy)] backdrop-blur-md text-white px-6 py-4 rounded-[var(--radius-card)] shadow-2xl border border-[var(--color-navy)] flex flex-wrap items-center justify-between gap-6 max-w-2xl w-full">
          <div>
            <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] font-bold uppercase tracking-wider block">
              {cart.length} Módulo(s) Selecionado(s)
            </span>
            <span className="text-lg font-semibold text-[var(--color-success)]">
              Total: {fmtCurrency(cartTotal)} {billingCycle === "MONTHLY" ? "/mês" : " (À vista)"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCheckoutStripe}
              disabled={isPending}
              className="px-6 py-3 bg-[#635bff] hover:bg-[#544dc9] text-white font-semibold text-xs rounded-[var(--radius-control)] shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isPending ? "Processando..." : "Pagar e Ativar no Stripe ➔"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
