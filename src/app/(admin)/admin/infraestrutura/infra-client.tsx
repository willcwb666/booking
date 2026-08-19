"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  type SystemServiceHealth,
  type TenantHealthSummary,
  getInfrastructureStatusAction,
} from "@/server/actions/admin-infra";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from "@/components/ui/icons";
import { toast } from "@/lib/toast-service";

type Props = {
  initialServices: SystemServiceHealth[];
  initialTenantSummary: TenantHealthSummary;
  initialCheckTimeMs: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  DATABASE: "Banco de dados",
  CACHE: "Cache",
  PAYMENTS: "Pagamentos",
  EMAIL: "E-mail",
  STORAGE: "Armazenamento",
  PUSH: "Push",
};

export function InfraClient({
  initialServices,
  initialTenantSummary,
  initialCheckTimeMs,
}: Props) {
  const [services, setServices] = useState<SystemServiceHealth[]>(initialServices);
  const [tenantSummary, setTenantSummary] =
    useState<TenantHealthSummary>(initialTenantSummary);
  const [checkTimeMs, setCheckTimeMs] = useState(initialCheckTimeMs);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRefreshStatus() {
    startTransition(async () => {
      const res = await getInfrastructureStatusAction();
      if (res.success) {
        setServices(res.services);
        setTenantSummary(res.tenantSummary);
        setCheckTimeMs(res.totalCheckTimeMs);
        setCheckedAt(new Date().toLocaleTimeString("pt-BR"));
      } else {
        toast.error("Falha na verificação", "Não foi possível consultar os serviços.");
      }
    });
  }

  const operationalCount = services.filter((s) => s.status === "OPERATIONAL").length;
  const degradedCount = services.filter((s) => s.status === "DEGRADED").length;
  const downCount = services.filter((s) => s.status === "DOWN").length;

  /**
   * "Tudo certo" só quando nada está degradado E nada está fora do ar.
   *
   * Antes a condição era `downCount === 0`, então um serviço degradado —
   * banco lento, gateway respondendo com aviso — ainda pintava o banner de
   * verde e escrevia "Todos os Sistemas Operacionais". Falso "tudo bem" em
   * tela de monitoramento é pior que não ter a tela.
   */
  const overall: "healthy" | "degraded" | "down" =
    downCount > 0 ? "down" : degradedCount > 0 ? "degraded" : "healthy";

  const OVERALL = {
    healthy: {
      title: "Todos os serviços operacionais",
      detail: "Nenhuma degradação nem falha detectada na última verificação.",
      tone: "success" as const,
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    degraded: {
      title: `${degradedCount} serviço(s) degradado(s)`,
      detail:
        "O sistema responde, mas com lentidão ou em modo alternativo. Confira o diagnóstico abaixo.",
      tone: "warning" as const,
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    down: {
      title: `${downCount} serviço(s) fora do ar`,
      detail:
        "Há componente sem resposta. Verifique conexões e chaves de API no diagnóstico abaixo.",
      tone: "danger" as const,
      icon: <XCircle className="w-5 h-5" />,
    },
  }[overall];

  return (
    <div className="page-content space-y-6">
      <PageHeader
        category="Plataforma"
        categoryIcon={<Shield className="w-3.5 h-3.5" />}
        title="Infraestrutura"
        description="Conectividade dos serviços de que a aplicação depende: banco, cache, pagamentos, e-mail e armazenamento."
        action={
          <button
            type="button"
            onClick={handleRefreshStatus}
            disabled={isPending}
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>{isPending ? "Verificando…" : "Verificar agora"}</span>
          </button>
        }
      />

      <div
        className="rounded-[var(--radius-panel)] border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          background: `var(--color-${OVERALL.tone}-light)`,
          borderColor: `var(--color-${OVERALL.tone}-border)`,
          color: `var(--color-${OVERALL.tone})`,
        }}
        role="status"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0">{OVERALL.icon}</span>
          <div className="min-w-0">
            <h2 className="font-semibold tracking-tight" style={{ fontSize: "var(--text-md)" }}>
              {OVERALL.title}
            </h2>
            <p style={{ fontSize: "var(--text-sm)", opacity: 0.85 }}>{OVERALL.detail}</p>
          </div>
        </div>

        {/*
          Antes havia um selo "Status Realtime" aqui. Não é tempo real: é uma
          fotografia tirada quando a página carregou ou quando alguém clicou em
          verificar. O rótulo agora diz exatamente isso.
        */}
        <span className="eyebrow flex items-center gap-1.5 shrink-0" style={{ color: "inherit" }}>
          <Clock className="w-3.5 h-3.5" />
          {checkedAt ? `verificado ${checkedAt}` : "verificado ao abrir"} · {checkTimeMs}ms
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Operacionais", value: `${operationalCount}/${services.length}`, hint: "respondendo normalmente" },
          { label: "Degradados", value: String(degradedCount), hint: "lentos ou em fallback" },
          { label: "Fora do ar", value: String(downCount), hint: "sem resposta" },
          {
            label: "Empresas ativas",
            value: `${tenantSummary.activeCompanies}/${tenantSummary.totalCompanies}`,
            hint: "com acesso liberado",
          },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card-label">{s.label}</span>
            <span className="stat-card-value">{s.value}</span>
            <span className="stat-card-delta">{s.hint}</span>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <div className="min-w-0">
            <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
              Serviços
            </h2>
            <p className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-xs)" }}>
              Latência medida no momento da verificação
            </p>
          </div>
        </div>

        <div
          className="table-container"
          style={{ border: 0, borderRadius: 0, boxShadow: "none" }}
        >
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Componente</th>
                <th scope="col">Categoria</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">
                  Latência
                </th>
                <th scope="col">Diagnóstico</th>
              </tr>
            </thead>
            <tbody>
              {services.map((srv) => (
                <tr key={srv.name}>
                  <td>
                    <p className="font-medium text-[var(--color-text-heading)]">{srv.name}</p>
                    <span className="eyebrow">{srv.lastChecked}</span>
                  </td>
                  <td className="text-[var(--color-text-muted)]">
                    {CATEGORY_LABELS[srv.category] ?? srv.category}
                  </td>
                  <td>
                    {srv.status === "OPERATIONAL" && (
                      <StatusBadge variant="success">Operacional</StatusBadge>
                    )}
                    {srv.status === "DEGRADED" && (
                      <StatusBadge variant="warning">Degradado</StatusBadge>
                    )}
                    {srv.status === "DOWN" && (
                      <StatusBadge variant="danger">Fora do ar</StatusBadge>
                    )}
                  </td>
                  <td data-type="number">{srv.latencyMs}ms</td>
                  <td className="text-[var(--color-text-muted)] max-w-md">{srv.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/*
        Aqui existia um botão "Auto-Recuperar Tenants" cujo onClick era apenas
        `toast.success("...reparo automático de tenants concluído com sucesso!")`.
        Nenhuma rotina rodava — a tela afirmava ter consertado webhooks do
        Stripe e validado chaves de API sem tocar em nada. A action de reparo
        que existe de verdade age em UMA empresa por vez e é acionada na tela
        de empresas, então esta seção volta a ser o que é: um resumo com o
        caminho para agir.
      */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ fontSize: "var(--text-md)" }}>
            Empresas
          </h2>
          <Link href="/admin/companies" className="btn btn-ghost btn-sm">
            Gerenciar
          </Link>
        </div>
        <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between gap-3 p-4 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
            <div className="min-w-0">
              <p className="font-medium text-[var(--color-text-heading)]">Com acesso liberado</p>
              <p className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-sm)" }}>
                Podem receber agendamentos
              </p>
            </div>
            <span className="stat-card-value" style={{ fontSize: "var(--text-2xl)" }}>
              {tenantSummary.activeCompanies}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 p-4 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">
            <div className="min-w-0">
              <p className="font-medium text-[var(--color-text-heading)]">Desativadas</p>
              <p className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-sm)" }}>
                Sem acesso ao sistema
              </p>
            </div>
            <span className="stat-card-value" style={{ fontSize: "var(--text-2xl)" }}>
              {tenantSummary.inactiveCompanies}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
