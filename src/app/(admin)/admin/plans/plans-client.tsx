"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePlanAction,
  upsertPlanFeatureAction,
  deletePlanFeatureAction,
} from "@/server/actions/plans";

type Feature = { id: string; featureKey: string; featureLabel: string; enabled: boolean };
type Plan = {
  id: string;
  tier: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  isActive: boolean;
  order: number;
  syncedWithStripe: boolean;
  features: Feature[];
};

export function PlansClient({ plans, stripeConfigured }: { plans: Plan[]; stripeConfigured: boolean }) {
  const router = useRouter();

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-1">
        <h1 className="text-xl font-bold text-gray-900">Planos</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Preços e recursos exibidos na landing page e cobrados via Stripe. Ao salvar um
        plano com preço, o produto e os preços são sincronizados automaticamente no Stripe.
      </p>

      {!stripeConfigured && (
        <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          ⚠ <code>STRIPE_SECRET_KEY</code> não configurada — os planos são salvos no banco, mas a
          cobrança de assinatura só funciona após configurar o Stripe.
        </div>
      )}

      <div className="space-y-5">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onSaved={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, onSaved }: { plan: Plan; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    fd.set("id", plan.id);
    startTransition(async () => {
      const result = await updatePlanAction(fd);
      if (result.success) {
        setSaved(true);
        onSaved();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{plan.tier}</span>
          {plan.syncedWithStripe ? (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Sincronizado no Stripe</span>
          ) : plan.priceMonthly > 0 || plan.priceYearly > 0 ? (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Não sincronizado</span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Grátis</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors?._ && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errors._[0]}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nome do plano</label>
            <input
              name="displayName"
              defaultValue={plan.displayName}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors?.displayName && <p className="text-xs text-red-600 mt-1">{errors.displayName[0]}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Ordem de exibição</label>
            <input
              name="order"
              type="number"
              min="0"
              defaultValue={plan.order}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Descrição</label>
          <input
            name="description"
            defaultValue={plan.description}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Preço mensal</label>
            <input
              name="priceMonthly"
              type="number"
              min="0"
              step="0.01"
              defaultValue={plan.priceMonthly}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors?.priceMonthly && <p className="text-xs text-red-600 mt-1">{errors.priceMonthly[0]}</p>}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Preço anual (total/ano)</label>
            <input
              name="priceYearly"
              type="number"
              min="0"
              step="0.01"
              defaultValue={plan.priceYearly}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors?.priceYearly && <p className="text-xs text-red-600 mt-1">{errors.priceYearly[0]}</p>}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="isActive" defaultChecked={plan.isActive} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          Plano ativo (visível na landing)
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar e sincronizar"}
          </button>
          {saved && <span className="text-sm text-green-700">Salvo!</span>}
        </div>
      </form>

      <FeaturesEditor planId={plan.id} features={plan.features} onSaved={onSaved} />
    </div>
  );
}

function FeaturesEditor({ planId, features, onSaved }: { planId: string; features: Feature[]; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();

  function addFeature(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("planId", planId);
    fd.set("enabled", "on");
    startTransition(async () => {
      await upsertPlanFeatureAction(fd);
      form.reset();
      onSaved();
    });
  }

  function removeFeature(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deletePlanFeatureAction(fd);
      onSaved();
    });
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recursos exibidos</p>
      <ul className="space-y-1.5 mb-3">
        {features.map((f) => (
          <li key={f.id} className="flex items-center justify-between text-sm">
            <span className={f.enabled ? "text-gray-700" : "text-gray-400 line-through"}>
              {f.enabled ? "✓" : "✗"} {f.featureLabel}
            </span>
            <button
              type="button"
              onClick={() => removeFeature(f.id)}
              disabled={pending}
              className="text-xs text-gray-400 hover:text-red-600"
            >
              remover
            </button>
          </li>
        ))}
        {features.length === 0 && <li className="text-sm text-gray-400">Nenhum recurso cadastrado.</li>}
      </ul>
      <form onSubmit={addFeature} className="flex gap-2">
        <input
          name="featureLabel"
          placeholder="Ex.: Agendamentos ilimitados"
          required
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
        >
          Adicionar
        </button>
      </form>
    </div>
  );
}
