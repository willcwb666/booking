"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePlanAction,
  upsertPlanFeatureAction,
  deletePlanFeatureAction,
  createPlanAction,
  reorderPlansAction,
  setPopularPlanAction,
  deletePlanAction,
} from "@/server/actions/plans";
import { toast } from "@/lib/toast-service";
import { CreditCard, CheckCircle2, Plus, Star } from "@/components/ui/icons";

type Feature = { id: string; featureKey: string; featureLabel: string; enabled: boolean };
type Plan = {
  id: string;
  tier: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  isActive: boolean;
  isPopular?: boolean;
  order: number;
  syncedWithStripe: boolean;
  features: Feature[];
};

function IconPencil() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function IconGripVertical() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  );
}

export function PlansClient({ plans: initialPlans, stripeConfigured }: { plans: Plan[]; stripeConfigured: boolean }) {
  const router = useRouter();
  const [plansList, setPlansList] = useState<Plan[]>(initialPlans);
  const [activeTab, setActiveTab] = useState<string>(initialPlans[0]?.id || "new");
  const [isPending, startTransition] = useTransition();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Form de novo plano
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanTier, setNewPlanTier] = useState("");
  const [newPlanDesc, setNewPlanDesc] = useState("");
  const [newPlanPriceMonthly, setNewPlanPriceMonthly] = useState(0);
  const [newPlanPriceYearly, setNewPlanPriceYearly] = useState(0);

  const currentPlan = plansList.find((p) => p.id === activeTab);

  // Drag and Drop reordering logic
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...plansList];
    const item = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, item);
    setDraggedIndex(index);
    setPlansList(updated);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    const orderedIds = plansList.map((p) => p.id);
    startTransition(async () => {
      const res = await reorderPlansAction(orderedIds);
      if (res.success) {
        toast.success("Ordem Atualizada", "A nova sequência dos planos foi salva.");
      } else {
        toast.error("Erro", res.error || "Falha ao salvar ordem.");
      }
    });
  }

  function handleSetPopular(planId: string) {
    startTransition(async () => {
      const res = await setPopularPlanAction(planId);
      if (res.success) {
        toast.success("Destaque Definido", "Este plano agora é o Mais Popular na landing page.");
        setPlansList((prev) =>
          prev.map((p) => ({
            ...p,
            isPopular: p.id === planId,
          }))
        );
      } else {
        toast.error("Erro", res.error || "Falha ao definir destaque.");
      }
    });
  }

  function handleDeletePlan(planId: string) {
    if (!confirm("Deseja realmente excluir este plano?")) return;
    startTransition(async () => {
      const res = await deletePlanAction(planId);
      if (res.success) {
        toast.success("Plano Excluído", res.message);
        const updated = plansList.filter((p) => p.id !== planId);
        setPlansList(updated);
        setActiveTab(updated[0]?.id || "new");
      } else {
        toast.error("Erro", res.error || "Falha ao excluir.");
      }
    });
  }

  function handleCreateNewPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlanName.trim() || !newPlanTier.trim()) {
      toast.error("Atenção", "Preencha o nome e o código identificador do plano.");
      return;
    }

    const fd = new FormData();
    fd.set("displayName", newPlanName);
    fd.set("tier", newPlanTier.toLowerCase().replace(/\s+/g, "_"));
    fd.set("description", newPlanDesc);
    fd.set("priceMonthly", String(newPlanPriceMonthly));
    fd.set("priceYearly", String(newPlanPriceYearly));
    fd.set("isActive", "on");

    startTransition(async () => {
      const res = await createPlanAction(fd);
      if (res.success) {
        toast.success("Plano Criado", "Novo plano cadastrado.");
        setNewPlanName("");
        setNewPlanTier("");
        setNewPlanDesc("");
        router.refresh();
      } else {
        toast.error("Erro ao Criar", res.error || "Falha ao criar plano.");
      }
    });
  }

  function handleGlobalSaveCurrentPlan() {
    const form = document.getElementById(`plan-form-${activeTab}`) as HTMLFormElement | null;
    if (form) {
      form.requestSubmit();
    }
  }

  return (
    <div className="w-full px-6 sm:px-10 py-8 text-left space-y-8 pb-32">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
          <CreditCard className="w-4 h-4" />
          <span>Gestão de Assinaturas</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
          Planos do SaaS
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Arraste as abas para reordenar a sequência de exibição na Landing Page. Defina o plano <strong>Mais Popular (Destaque)</strong> com 1 clique.
        </p>
      </div>

      {!stripeConfigured && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
          ⚠ <code>STRIPE_SECRET_KEY</code> não configurada — os planos são salvos no banco, mas a cobrança só funcionará no Stripe após configurar a chave.
        </div>
      )}

      {/* Tab Bar por Plano com Drag-and-Drop + Botão [+] Criar Novo Plano */}
      <div className="bg-slate-100/80 p-2 rounded-2xl border border-slate-200/60 inline-flex flex-wrap items-center gap-2">
        {plansList.map((p, idx) => {
          const isActive = activeTab === p.id;
          return (
            <div
              key={p.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-grab active:cursor-grabbing border ${
                isActive
                  ? "bg-white text-indigo-600 shadow-2xs border-slate-200 font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border-transparent"
              }`}
            >
              <span className="text-slate-300 hover:text-slate-600">
                <IconGripVertical />
              </span>

              <button
                type="button"
                onClick={() => setActiveTab(p.id)}
                className="flex items-center gap-1.5"
              >
                <span>{p.displayName}</span>
                {p.isPopular && (
                  <span className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shadow-2xs">
                    ★ Destaque
                  </span>
                )}
              </button>

              {/* Botão de Excluir em Ícone Lixeira SVG */}
              <button
                type="button"
                onClick={() => handleDeletePlan(p.id)}
                title="Excluir Plano"
                className="p-1 text-slate-300 hover:text-red-600 transition-colors ml-1"
              >
                <IconTrash />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setActiveTab("new")}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "new"
              ? "bg-[#635bff] text-white shadow-2xs font-black"
              : "text-indigo-600 hover:bg-indigo-50 bg-indigo-50/50 border border-indigo-100"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Novo Plano</span>
        </button>
      </div>

      {/* Conteúdo da Aba do Plano Ativo */}
      {currentPlan && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
          <PlanCard
            plan={currentPlan}
            onSaved={() => router.refresh()}
            onSetPopular={() => handleSetPopular(currentPlan.id)}
          />
        </div>
      )}

      {/* Conteúdo da Aba de Criação de Novo Plano */}
      {activeTab === "new" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900">Cadastrar Novo Plano no SaaS</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Crie uma nova opção de assinatura com precificação personalizada.
            </p>
          </div>

          <form onSubmit={handleCreateNewPlan} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Plano Enterprise"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Código Identificador (Tier)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: enterprise"
                  value={newPlanTier}
                  onChange={(e) => setNewPlanTier(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Descrição Comercial</label>
              <input
                type="text"
                placeholder="Ex: Ideal para grandes redes e franqueadas"
                value={newPlanDesc}
                onChange={(e) => setNewPlanDesc(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preço Mensal (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPlanPriceMonthly}
                  onChange={(e) => setNewPlanPriceMonthly(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Preço Anual (R$ Total)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPlanPriceYearly}
                  onChange={(e) => setNewPlanPriceYearly(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2.5 bg-[#635bff] hover:bg-[#544dc9] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Cadastrando..." : "Cadastrar Plano no Banco e Stripe ➔"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RODAPÉ FIXO DE SALVAR E SINCRONIZAR */}
      {currentPlan && (
        <div className="fixed bottom-6 right-8 z-40 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Plano Selecionado: {currentPlan.displayName}
            </span>
            <span className="text-xs font-extrabold text-white">Pronto para salvar no Stripe</span>
          </div>

          <button
            type="button"
            onClick={handleGlobalSaveCurrentPlan}
            disabled={isPending}
            className="px-5 py-2.5 bg-[#635bff] hover:bg-[#544dc9] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Salvar e Sincronizar Plano</span>
          </button>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onSaved,
  onSetPopular,
}: {
  plan: Plan;
  onSaved: () => void;
  onSetPopular: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]> | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", plan.id);
    startTransition(async () => {
      const result = await updatePlanAction(fd);
      if (result.success) {
        toast.success("Salvo!", "Plano sincronizado com sucesso no Stripe.");
        onSaved();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
            {plan.tier}
          </span>
          {plan.syncedWithStripe ? (
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              Sincronizado no Stripe
            </span>
          ) : (
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
              Não sincronizado
            </span>
          )}
        </div>

        {/* Checkbox "Destaque / Mais Popular" (Apenas 1 plano por vez) */}
        <label className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-xs font-bold text-amber-900 cursor-pointer shadow-2xs">
          <input
            type="checkbox"
            checked={Boolean(plan.isPopular)}
            onChange={onSetPopular}
            className="w-4 h-4 text-amber-600 rounded"
          />
          <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
          <span>Destaque / Mais Popular na Landing Page</span>
        </label>
      </div>

      <form id={`plan-form-${plan.id}`} onSubmit={handleSubmit} className="space-y-4">
        {errors?._ && (
          <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            {errors._[0]}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Plano</label>
            <input
              name="displayName"
              defaultValue={plan.displayName}
              required
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
            {errors?.displayName && <p className="text-xs text-red-600 mt-1">{errors.displayName[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descrição Comercial</label>
            <input
              name="description"
              defaultValue={plan.description}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Preço Mensal (R$)</label>
            <input
              name="priceMonthly"
              type="number"
              min="0"
              step="0.01"
              defaultValue={plan.priceMonthly}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
            {errors?.priceMonthly && <p className="text-xs text-red-600 mt-1">{errors.priceMonthly[0]}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Preço Anual (R$ Total/Ano)</label>
            <input
              name="priceYearly"
              type="number"
              min="0"
              step="0.01"
              defaultValue={plan.priceYearly}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
            {errors?.priceYearly && <p className="text-xs text-red-600 mt-1">{errors.priceYearly[0]}</p>}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-2">
          <input type="checkbox" name="isActive" defaultChecked={plan.isActive} className="w-4 h-4 text-indigo-600 rounded" />
          <span>Plano Ativo (Exibido nas tabelas de preços e landing page)</span>
        </label>
      </form>

      <FeaturesEditor planId={plan.id} features={plan.features} onSaved={onSaved} />
    </div>
  );
}

function FeaturesEditor({ planId, features, onSaved }: { planId: string; features: Feature[]; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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
    if (!confirm("Remover este recurso do plano?")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deletePlanFeatureAction(fd);
      onSaved();
    });
  }

  function startEdit(f: Feature) {
    setEditingId(f.id);
    setEditValue(f.featureLabel);
  }

  function saveEdit(f: Feature) {
    const label = editValue.trim();
    if (!label) return;
    const fd = new FormData();
    fd.set("planId", planId);
    fd.set("featureKey", f.featureKey);
    fd.set("featureLabel", label);
    if (f.enabled) fd.set("enabled", "on");
    startTransition(async () => {
      await upsertPlanFeatureAction(fd);
      setEditingId(null);
      onSaved();
    });
  }

  return (
    <div className="pt-4 border-t border-slate-100 space-y-3">
      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
        Recursos Incluídos neste Plano
      </span>

      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
            {editingId === f.id ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); saveEdit(f); }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => saveEdit(f)}
                  disabled={pending}
                  className="px-3 py-1 text-xs font-bold bg-[#635bff] text-white rounded-lg hover:bg-[#544dc9]"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <>
                <span className={`font-semibold ${f.enabled ? "text-slate-800" : "text-slate-400 line-through"}`}>
                  {f.enabled ? "✓" : "✗"} {f.featureLabel}
                </span>

                {/* Ícones SVG Caneta e Lixeira */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEdit(f)}
                    title="Editar Recurso"
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <IconPencil />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFeature(f.id)}
                    title="Excluir Recurso"
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <IconTrash />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={addFeature} className="flex gap-2 pt-2">
        <input
          name="featureLabel"
          placeholder="Ex: Suporte prioritário 24/7"
          required
          className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
        >
          + Adicionar Recurso
        </button>
      </form>
    </div>
  );
}
