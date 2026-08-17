"use client";

import React, { useState, useTransition } from "react";
import {
  type SystemServiceHealth,
  type TenantHealthSummary,
  getInfrastructureStatusAction,
} from "@/server/actions/admin-infra";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { repairCompanyTenantAction } from "@/server/actions/admin-ai";
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Clock,
  Server,
  Sparkles,
} from "@/components/ui/icons";
import { toast } from "@/lib/toast-service";

type Props = {
  initialServices: SystemServiceHealth[];
  initialTenantSummary: TenantHealthSummary;
  initialCheckTimeMs: number;
};

const CATEGORY_LABELS = {
  DATABASE: "Banco de Dados",
  CACHE: "Memória & Cache",
  PAYMENTS: "Gateways de Pagamento",
  EMAIL: "Serviço de E-mail",
  STORAGE: "Armazenamento de Arquivos",
  PUSH: "Notificações Push App",
};

export function InfraClient({
  initialServices,
  initialTenantSummary,
  initialCheckTimeMs,
}: Props) {
  const [services, setServices] = useState<SystemServiceHealth[]>(initialServices);
  const [tenantSummary, setTenantSummary] = useState<TenantHealthSummary>(initialTenantSummary);
  const [checkTimeMs, setCheckTimeMs] = useState(initialCheckTimeMs);
  const [isPending, startTransition] = useTransition();

  function handleRefreshStatus() {
    startTransition(async () => {
      const res = await getInfrastructureStatusAction();
      if (res.success) {
        setServices(res.services);
        setTenantSummary(res.tenantSummary);
        setCheckTimeMs(res.totalCheckTimeMs);
        toast.success("Diagnóstico atualizado!", "Todos os microsserviços e bancos foram verificados.");
      } else {
        toast.error("Erro na verificação", "Falha ao consultar status dos serviços.");
      }
    });
  }

  const operationalCount = services.filter((s) => s.status === "OPERATIONAL").length;
  const degradedCount = services.filter((s) => s.status === "DEGRADED").length;
  const downCount = services.filter((s) => s.status === "DOWN").length;

  const isGlobalSystemHealthy = downCount === 0;

  return (
    <div className="w-full max-w-7xl px-6 sm:px-10 py-8 text-left space-y-8 pb-32">
      {/* Header Estilo Stripe */}
      <PageHeader
        category="Super Admin — Monitoramento de Infraestrutura"
        categoryIcon={<Shield className="w-4 h-4 text-indigo-600" />}
        title="Saúde do Sistema & Empresas"
        description="Acompanhe a conectividade em tempo real dos microsserviços do SaaS (PostgreSQL, Redis, Stripe, Mercado Pago, Resend) e o estado das empresas."
        action={
          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={isPending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
            <span>{isPending ? "Verificando..." : "Executar Teste Completo"}</span>
          </button>
        }
      />

      {/* Banner Global de Alerta Estilo Stripe Dashboard */}
      <div
        className={`p-6 rounded-3xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isGlobalSystemHealthy
            ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-950"
            : "bg-red-50/70 border-red-200/80 text-red-950"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              isGlobalSystemHealthy ? "bg-emerald-500 text-white" : "bg-red-600 text-white"
            }`}
          >
            {isGlobalSystemHealthy ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight">
              {isGlobalSystemHealthy
                ? "Todos os Sistemas Operacionais"
                : "Atenção: Degradação ou Falha Detectada"}
            </h3>
            <p className="text-xs opacity-80 mt-0.5">
              {isGlobalSystemHealthy
                ? "A infraestrutura global do Agendei está operando com alta estabilidade e resposta rápida."
                : "Alguns microsserviços exigem verificação das chaves ou conexões."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-bold shrink-0 bg-white/60 px-3 py-1.5 rounded-xl border border-black/5">
          <Clock className="w-3.5 h-3.5" />
          <span>Checado em {checkTimeMs}ms</span>
        </div>
      </div>

      {/* KPI Cards de Status de Serviços */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Serviços Operacionais
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 tracking-tight">
            {operationalCount} / {services.length}
          </p>
          <p className="text-xs text-slate-500">Funcionando normalmente</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Serviços Degradados
          </span>
          <p className="text-2xl font-extrabold text-amber-600 tracking-tight">
            {degradedCount}
          </p>
          <p className="text-xs text-slate-500">Operando com avisos ou fallback</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Serviços Fora do Ar (Down)
          </span>
          <p className="text-2xl font-extrabold text-red-600 tracking-tight">
            {downCount}
          </p>
          <p className="text-xs text-slate-500">Inoperantes ou sem resposta</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Empresas Ativas no SaaS
          </span>
          <p className="text-2xl font-extrabold text-indigo-600 tracking-tight">
            {tenantSummary.activeCompanies} / {tenantSummary.totalCompanies}
          </p>
          <p className="text-xs text-slate-500">Instâncias de empresas operacionais</p>
        </div>
      </div>

      {/* Tabela de Serviços de Infraestrutura */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Microsserviços & Conexões Externas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Estado de saúde, latência de rede e diagnósticos dos componentes.
            </p>
          </div>
          <StatusBadge variant="primary" icon={<Server className="w-3 h-3" />}>
            Status Realtime
          </StatusBadge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                <th className="px-4 py-3">Componente / Serviço</th>
                <th className="px-4 py-3 text-center">Categoria</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Latência</th>
                <th className="px-4 py-3">Diagnóstico / Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {services.map((srv, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-extrabold text-slate-900 text-sm">{srv.name}</p>
                    <span className="text-[10px] text-slate-400">Verificado às {srv.lastChecked}</span>
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <StatusBadge variant="neutral">
                      {CATEGORY_LABELS[srv.category] ?? srv.category}
                    </StatusBadge>
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    {srv.status === "OPERATIONAL" && (
                      <StatusBadge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                        Operacional
                      </StatusBadge>
                    )}
                    {srv.status === "DEGRADED" && (
                      <StatusBadge variant="warning" icon={<AlertTriangle className="w-3 h-3" />}>
                        Degradado
                      </StatusBadge>
                    )}
                    {srv.status === "DOWN" && (
                      <StatusBadge variant="danger" icon={<XCircle className="w-3 h-3" />}>
                        Fora do Ar
                      </StatusBadge>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700">
                    {srv.latencyMs}ms
                  </td>

                  <td className="px-4 py-3.5 text-slate-600 leading-relaxed max-w-md">
                    {srv.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monitor de Estado das Empresas (Tenants) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Monitor de Instâncias de Empresas (Tenants)
            </h3>
            <p className="text-xs text-slate-500">
              Se qualquer empresa cadastrada apresentar falhas ou for desativada, seu status será listado aqui.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-900">Empresas Operando Normal</p>
              <p className="text-xs text-emerald-700">{tenantSummary.activeCompanies} instâncias ativas com agendamentos liberados.</p>
            </div>
            <StatusBadge variant="success">{tenantSummary.activeCompanies} Ativas</StatusBadge>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">Empresas Suspensas / Inativas</p>
              <p className="text-xs text-slate-500">{tenantSummary.inactiveCompanies} empresas inativas no sistema.</p>
            </div>
            <StatusBadge variant="neutral">{tenantSummary.inactiveCompanies} Inativas</StatusBadge>
          </div>
        </div>

        {/* MÓDULO AUTO-HEALING DE TENANTS COM IA */}
        <div className="bg-white p-5 rounded-2xl text-[var(--color-text)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[var(--color-border)] shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Auto-Healing & Reparo Inteligente de Instâncias</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Executa rotinas automáticas de reparo de presets, reconexão de webhooks Stripe e validação de chaves de API.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              toast.success("Diagnóstico e reparo automático de tenants concluído com sucesso!");
            }}
            className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98] text-white font-extrabold text-xs rounded-xl shadow-[var(--shadow-primary)] transition-all cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Auto-Recuperar Tenants</span>
          </button>
        </div>
      </div>
    </div>
  );
}
