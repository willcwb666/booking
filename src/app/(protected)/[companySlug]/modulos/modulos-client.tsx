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
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
          <Tag className="w-4 h-4" />
          <span>App Marketplace</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
          Módulos & Add-ons
        </h1>
        <p className="text-xs text-slate-500 mt-1">
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
              className={`bg-white rounded-3xl border transition-all p-6 space-y-4 shadow-2xs relative flex flex-col justify-between ${
                isOwned
                  ? "border-emerald-200 bg-emerald-50/20"
                  : inCart
                  ? "border-indigo-500 ring-2 ring-indigo-500 shadow-md"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    {m.category}
                  </span>
                  {isOwned ? (
                    <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                    </span>
                  ) : inCart ? (
                    <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                      No Carrinho
                    </span>
                  ) : null}
                </div>

                <h3 className="text-base font-extrabold text-slate-900">{m.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{m.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Investimento</span>
                  <span className="text-base font-black text-slate-900">
                    {m.monthlyPrice > 0 ? `${fmtCurrency(m.monthlyPrice)}/mês` : fmtCurrency(m.lifetimePrice)}
                  </span>
                </div>

                {!isOwned ? (
                  <button
                    type="button"
                    onClick={() => toggleCartItem(m.code)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      inCart
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-[#635bff] hover:bg-[#544dc9] text-white shadow-xs"
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{inCart ? "Remover do Carrinho" : "Adicionar ao Carrinho"}</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-100 text-emerald-800 cursor-default flex items-center justify-center gap-2"
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-6 max-w-2xl w-full">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              {cart.length} Módulo(s) Selecionado(s)
            </span>
            <span className="text-lg font-black text-emerald-400">
              Total: {fmtCurrency(cartTotal)} {billingCycle === "MONTHLY" ? "/mês" : " (À vista)"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCheckoutStripe}
              disabled={isPending}
              className="px-6 py-3 bg-[#635bff] hover:bg-[#544dc9] text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
