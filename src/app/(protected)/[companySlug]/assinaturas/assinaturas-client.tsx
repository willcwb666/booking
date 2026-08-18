"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "@/lib/toast-service";
import {
  CreditCard,
  Plus,
  Search,
  Users,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Calendar,
  Tag,
  ArrowUpRight,
  Shield,
  Edit2,
  Clock,
  Scissors,
  DollarSign,
  AlertTriangle,
} from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import {
  createMembershipPlanAction,
  updateMembershipPlanAction,
  toggleMembershipPlanAction,
  createCustomerMembershipAction,
  cancelCustomerMembershipAction,
  adjustCustomerMembershipSessionsAction,
} from "@/server/actions/memberships";
import type {
  MembershipStats,
  MembershipPlanItem,
  CustomerMembershipItem,
} from "@/server/queries/memberships";

type Props = {
  companySlug: string;
  companyName: string;
  currency: string;
  stats: MembershipStats;
  plans: MembershipPlanItem[];
  membershipsResult: {
    items: CustomerMembershipItem[];
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
  services: Array<{ id: string; name: string }>;
  currentSearch: string;
  currentStatus: string;
};

export function AssinaturasClient({
  companySlug,
  companyName,
  currency,
  stats,
  plans,
  membershipsResult,
  services,
  currentSearch,
  currentStatus,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Tab de visualização
  const [activeTab, setActiveTab] = useState<"plans" | "members">("plans");

  // Modais
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlanItem | null>(null);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [adjustingMember, setAdjustingMember] = useState<CustomerMembershipItem | null>(null);
  const [newSessionsCount, setNewSessionsCount] = useState<number>(0);

  // Form de Plano
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planInterval, setPlanInterval] = useState("month");
  const [isUnlimitedSessions, setIsUnlimitedSessions] = useState(true);
  const [planSessions, setPlanSessions] = useState("4");
  const [planDiscount, setPlanDiscount] = useState("0");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Form de Adicionar Membro
  const [memberPlanId, setMemberPlanId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberNotes, setMemberNotes] = useState("");

  const fmtCurrency = (val: number) =>
    val.toLocaleString(currency === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    });

  // Atualiza parâmetros de busca
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

  function handleOpenCreatePlan() {
    setEditingPlan(null);
    setPlanName("");
    setPlanDesc("");
    setPlanPrice("");
    setPlanInterval("month");
    setIsUnlimitedSessions(true);
    setPlanSessions("4");
    setPlanDiscount("0");
    setSelectedServiceIds([]);
    setIsPlanModalOpen(true);
  }

  function handleOpenEditPlan(p: MembershipPlanItem) {
    setEditingPlan(p);
    setPlanName(p.name);
    setPlanDesc(p.description || "");
    setPlanPrice(String(p.price));
    setPlanInterval(p.interval);
    setIsUnlimitedSessions(p.includedSessionsCount === null);
    setPlanSessions(p.includedSessionsCount ? String(p.includedSessionsCount) : "4");
    setPlanDiscount(String(p.discountPercent));
    setSelectedServiceIds(p.serviceIds || []);
    setIsPlanModalOpen(true);
  }

  function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!planName.trim() || !planPrice) {
      toast.error("Preencha o nome e o valor do plano");
      return;
    }

    startTransition(async () => {
      const priceNum = parseFloat(planPrice.replace(",", "."));
      const discountNum = parseFloat(planDiscount.replace(",", ".")) || 0;
      const sessions = isUnlimitedSessions ? null : parseInt(planSessions, 10) || 4;

      if (editingPlan) {
        const res = await updateMembershipPlanAction(companySlug, editingPlan.id, {
          name: planName,
          description: planDesc,
          price: priceNum,
          interval: planInterval,
          includedSessionsCount: sessions,
          discountPercent: discountNum,
          serviceIds: selectedServiceIds,
        });
        if (res.success) {
          toast.success("Plano atualizado com sucesso!");
          setIsPlanModalOpen(false);
          router.refresh();
        } else {
          toast.error(res.error ?? "Ocorreu um erro");
        }
      } else {
        const res = await createMembershipPlanAction(companySlug, {
          name: planName,
          description: planDesc,
          price: priceNum,
          interval: planInterval,
          includedSessionsCount: sessions,
          discountPercent: discountNum,
          serviceIds: selectedServiceIds,
        });
        if (res.success) {
          toast.success("Plano de assinatura criado com sucesso!");
          setIsPlanModalOpen(false);
          router.refresh();
        } else {
          toast.error(res.error ?? "Ocorreu um erro");
        }
      }
    });
  }

  function handleTogglePlan(planId: string) {
    startTransition(async () => {
      const res = await toggleMembershipPlanAction(companySlug, planId);
      if (res.success) {
        toast.success("Status do plano alterado!");
        router.refresh();
      } else {
        toast.error(res.error ?? "Ocorreu um erro");
      }
    });
  }

  function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!memberPlanId || !memberName.trim() || !memberEmail.trim()) {
      toast.error("Selecione o plano e informe nome e e-mail do cliente");
      return;
    }

    startTransition(async () => {
      const res = await createCustomerMembershipAction(companySlug, {
        planId: memberPlanId,
        customerName: memberName,
        customerEmail: memberEmail,
        customerPhone: memberPhone,
        notes: memberNotes,
      });
      if (res.success) {
        toast.success("Cliente associado ao plano com sucesso!");
        setIsMemberModalOpen(false);
        setMemberName("");
        setMemberEmail("");
        setMemberPhone("");
        setMemberNotes("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Ocorreu um erro");
      }
    });
  }

  function handleCancelMembership(id: string) {
    if (!confirm("Deseja realmente cancelar esta assinatura? O cliente deixará de ter cobertura.")) return;

    startTransition(async () => {
      const res = await cancelCustomerMembershipAction(companySlug, id);
      if (res.success) {
        toast.success("Assinatura cancelada.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Ocorreu um erro");
      }
    });
  }

  function handleSaveAdjustSessions() {
    if (!adjustingMember) return;
    startTransition(async () => {
      const res = await adjustCustomerMembershipSessionsAction(companySlug, adjustingMember.id, newSessionsCount);
      if (res.success) {
        toast.success("Saldo de sessões atualizado!");
        setAdjustingMember(null);
        router.refresh();
      } else {
        toast.error(res.error ?? "Ocorreu um erro");
      }
    });
  }

  return (
    <div className="page-content space-y-8">
      {/* HEADER DO CLUBE DE ASSINATURAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-[var(--color-border)] shadow-xs relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Receita Recorrente & Fidelização</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CLUBE ATIVO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            Clube de Assinaturas & Pacotes
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] max-w-xl">
            Crie planos mensais de serviços ilimitados ou combos de sessões pré-pagas para garantir receita previsível.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 z-10">
          <button
            type="button"
            onClick={handleOpenCreatePlan}
            className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98] text-white rounded-xl transition-all font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-[var(--shadow-primary)]"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Plano / Pacote</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              MRR de Assinaturas
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {fmtCurrency(stats.monthlyRecurringRevenue)}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Receita mensal recorrente estimada
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Membros Ativos
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {stats.activeMembers}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Clientes com cobertura ativa
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Sessões Utilizadas
            </span>
            <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {stats.sessionsUsedThisMonth}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Atendimentos cobertos este mês
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Planos Cadastrados
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-2xs">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            {stats.totalPlans}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
            Opções ativas no catálogo
          </p>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === "plans"
              ? "bg-[var(--color-primary)] text-white shadow-xs"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
          }`}
        >
          Planos & Pacotes ({plans.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === "members"
              ? "bg-[var(--color-primary)] text-white shadow-xs"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
          }`}
        >
          Assinantes & Membros ({membershipsResult.total})
        </button>
      </div>

      {/* ABA 1: PLANOS & PACOTES */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          {plans.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[var(--color-border)] p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-bg-subtle)] text-[var(--color-primary)] flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-[var(--color-text-heading)]">
                Nenhum plano de assinatura cadastrado
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto">
                Crie planos recorrentes (ex: "Cabelo Ilimitado por R$ 79/mês") ou pacotes pré-pagos (ex: "Pacote 4 Sessões") para fidelizar clientes.
              </p>
              <button
                type="button"
                onClick={handleOpenCreatePlan}
                className="mt-2 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeiro Plano</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className={`bg-white rounded-3xl border p-6 space-y-4 shadow-xs transition-all ${
                    p.isActive ? "border-[var(--color-border)]" : "border-slate-200 opacity-60 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-[var(--color-bg-subtle)] text-[var(--color-primary)] border border-[var(--color-border)]">
                        {p.interval === "month"
                          ? "Mensal"
                          : p.interval === "quarter"
                          ? "Trimestral"
                          : p.interval === "year"
                          ? "Anual"
                          : "Pacote Avulso"}
                      </span>
                      <h3 className="text-base font-black text-[var(--color-text-heading)] mt-2">{p.name}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlan(p)}
                        className="p-2 text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] rounded-xl transition-colors cursor-pointer"
                        title="Editar plano"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{p.description}</p>
                  )}

                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <p className="text-2xl font-black text-[var(--color-text-heading)]">
                      {fmtCurrency(p.price)}
                      <span className="text-xs font-semibold text-[var(--color-text-muted)] font-mono ml-1">
                        /{p.interval === "month" ? "mês" : p.interval === "quarter" ? "trimestre" : p.interval === "year" ? "ano" : "pacote"}
                      </span>
                    </p>
                  </div>

                  {/* Benefícios inclusos */}
                  <div className="space-y-1.5 text-xs text-[var(--color-text)]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {p.includedSessionsCount === null
                          ? "Sessões ilimitadas no período"
                          : `${p.includedSessionsCount} sessões inclusas por ciclo`}
                      </span>
                    </div>

                    {p.discountPercent > 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{p.discountPercent}% OFF em outros serviços</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[var(--color-text-subtle)]">
                      <Users className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
                      <span>{p.activeMembersCount} assinante(s) ativo(s)</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleTogglePlan(p.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                        p.isActive
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                      }`}
                    >
                      {p.isActive ? "Desativar Plano" : "Ativar Plano"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMemberPlanId(p.id);
                        setIsMemberModalOpen(true);
                      }}
                      className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ Adicionar Membro</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: ASSINANTES & MEMBROS */}
      {activeTab === "members" && (
        <div className="space-y-6">
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
                  placeholder="Buscar por nome, e-mail ou plano..."
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
                <option value="CANCELLED">Cancelados</option>
                <option value="PAUSED">Pausados</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (plans.length > 0) setMemberPlanId(plans[0].id);
                setIsMemberModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Vincular Cliente a Plano</span>
            </button>
          </div>

          {/* TABELA DE MEMBROS */}
          <div className="bg-white rounded-3xl border border-[var(--color-border)] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 text-[var(--color-text-subtle)] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Cliente / E-mail</th>
                    <th className="py-3.5 px-4">Plano Contratado</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Saldo de Sessões</th>
                    <th className="py-3.5 px-4">Renovação</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {membershipsResult.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[var(--color-text-muted)]">
                        Nenhum membro encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    membershipsResult.items.map((m) => (
                      <tr key={m.id} className="hover:bg-[var(--color-bg-subtle)]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-extrabold text-[var(--color-text-heading)]">{m.customerName}</p>
                          <p className="text-[11px] text-[var(--color-text-muted)]">{m.customerEmail}</p>
                          {m.customerPhone && (
                            <p className="text-[10px] text-[var(--color-text-subtle)]">{m.customerPhone}</p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[var(--color-text-heading)]">{m.planName}</p>
                          <p className="text-[10px] text-[var(--color-primary)] font-semibold">
                            {fmtCurrency(m.planPrice)} / {m.planInterval === "month" ? "mês" : m.planInterval}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              m.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {m.status === "ACTIVE" ? "ATIVO" : "CANCELADO"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {m.isUnlimited ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Ilimitado
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <strong className="text-[var(--color-text-heading)] font-black text-sm">
                                {m.remainingSessions ?? 0}
                              </strong>
                              <span className="text-[var(--color-text-subtle)] text-[11px]">restantes</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAdjustingMember(m);
                                  setNewSessionsCount(m.remainingSessions ?? 0);
                                }}
                                className="text-[10px] text-[var(--color-primary)] hover:underline ml-1 cursor-pointer font-bold"
                              >
                                [Ajustar]
                              </button>
                            </div>
                          )}
                          <span className="text-[10px] text-[var(--color-text-subtle)] block">
                            {m.totalUsages} atendimento(s) realizado(s)
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[var(--color-text-muted)]">
                          {m.renewsAt ? new Date(m.renewsAt).toLocaleDateString("pt-BR") : "Sem expiração"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {m.status === "ACTIVE" && (
                            <button
                              type="button"
                              onClick={() => handleCancelMembership(m.id)}
                              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINAÇÃO GLOBAL */}
            {membershipsResult.total > 0 && (
              <div className="p-4 border-t border-[var(--color-border)]">
                <Pagination
                  currentPage={membershipsResult.page}
                  totalItems={membershipsResult.total}
                  pageSize={membershipsResult.pageSize}
                  onPageChange={(page) => updateQuery({ page })}
                  onPageSizeChange={(pageSize) => updateQuery({ pageSize, page: 1 })}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CRIAR / EDITAR PLANO */}
      {isPlanModalOpen && (
        <Modal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          title={editingPlan ? "Editar Plano de Assinatura" : "Novo Plano / Pacote de Sessões"}
        >
          <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Nome do Plano *
              </label>
              <input
                type="text"
                required
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Ex: Clube VIP Cabelo & Barba ou Pacote 4 Faxinas"
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Descrição (opcional)
              </label>
              <textarea
                rows={2}
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder="Ex: Cortes e barbas ilimitados com direito a cerveja cortesia e 10% OFF em produtos."
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Preço ({currency}) *
                </label>
                <input
                  type="text"
                  required
                  value={planPrice}
                  onChange={(e) => setPlanPrice(e.target.value)}
                  placeholder="89,90"
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Periodicidade
                </label>
                <select
                  value={planInterval}
                  onChange={(e) => setPlanInterval(e.target.value)}
                  className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] focus:outline-none cursor-pointer"
                >
                  <option value="month">Mensal</option>
                  <option value="quarter">Trimestral</option>
                  <option value="year">Anual</option>
                  <option value="one_time_package">Pacote Único (Pré-pago)</option>
                </select>
              </div>
            </div>

            {/* Regras de Sessões */}
            <div className="p-3.5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUnlimitedSessions}
                  onChange={(e) => setIsUnlimitedSessions(e.target.checked)}
                  className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                />
                <span className="font-bold text-[var(--color-text-heading)]">Sessões ilimitadas no período</span>
              </label>

              {!isUnlimitedSessions && (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                    Quantidade de sessões incluídas por ciclo
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={planSessions}
                    onChange={(e) => setPlanSessions(e.target.value)}
                    className="w-32 bg-white border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                  Desconto extra em outros serviços avulsos (% off)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={planDiscount}
                  onChange={(e) => setPlanDiscount(e.target.value)}
                  className="w-32 bg-white border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                />
              </div>
            </div>

            {/* Seleção de Serviços Cobertos */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1.5">
                Serviços Cobertos (deixe vazio para cobrir todos)
              </label>
              <div className="max-h-40 overflow-y-auto p-2 bg-[var(--color-bg-subtle)] rounded-xl border border-[var(--color-border)] space-y-1.5">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedServiceIds([...selectedServiceIds, s.id]);
                        } else {
                          setSelectedServiceIds(selectedServiceIds.filter((id) => id !== s.id));
                        }
                      }}
                      className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
                    />
                    <span className="text-xs text-[var(--color-text-heading)]">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar Plano"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL ADICIONAR MEMBRO MANUAL */}
      {isMemberModalOpen && (
        <Modal
          isOpen={isMemberModalOpen}
          onClose={() => setIsMemberModalOpen(false)}
          title="Vincular Cliente ao Clube / Pacote"
        >
          <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Selecione o Plano *
              </label>
              <select
                required
                value={memberPlanId}
                onChange={(e) => setMemberPlanId(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] focus:outline-none cursor-pointer"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {fmtCurrency(p.price)} ({p.includedSessionsCount === null ? "Ilimitado" : `${p.includedSessionsCount} sessões`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Nome do Cliente *
              </label>
              <input
                type="text"
                required
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                E-mail do Cliente * (usado para reconhecimento no checkout)
              </label>
              <input
                type="email"
                required
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Telefone / WhatsApp (opcional)
              </label>
              <input
                type="text"
                value={memberPhone}
                onChange={(e) => setMemberPhone(e.target.value)}
                placeholder="(11) 98888-7777 ou +1 720 555-0199"
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Observações internas
              </label>
              <textarea
                rows={2}
                value={memberNotes}
                onChange={(e) => setMemberNotes(e.target.value)}
                placeholder="Ex: Pagou via PIX no balcão / Contrato anual presencial"
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Associando..." : "Confirmar Associação"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL AJUSTAR SESSÕES RESTANTES */}
      {adjustingMember && (
        <Modal
          isOpen={!!adjustingMember}
          onClose={() => setAdjustingMember(null)}
          title={`Ajustar Saldo de Sessões — ${adjustingMember.customerName}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-[var(--color-text-muted)]">
              Defina o novo saldo de créditos/sessões disponíveis para este cliente utilizar em seus agendamentos:
            </p>

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-text-heading)] mb-1">
                Novo Saldo de Sessões
              </label>
              <input
                type="number"
                min={0}
                value={newSessionsCount}
                onChange={(e) => setNewSessionsCount(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-base font-black text-[var(--color-text-heading)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setAdjustingMember(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustSessions}
                disabled={isPending}
                className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Salvando..." : "Salvar Saldo"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
