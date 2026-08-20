"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/server/actions/auth";
import { KreatorIcon } from "@/components/ui/kreator-logo";
import {
  Activity,
  ArrowRightLeft,
  BarChart2,
  Bell,
  Building2,
  CreditCard,
  Gem,
  LayoutDashboard,
  LogOut,
  Server,
  Settings,
  Star,
  Tag,
  Users,
  Zap,
  FileText,
} from "@/components/ui/icons";
import { NavSidebar, type NavGroup } from "@/components/ui/nav-sidebar";
import { getSystemNotificationsAction } from "@/server/actions/notifications-system";
import type { CompanySelectorItem } from "@/server/queries/admin";

const ICON = "h-4 w-4 shrink-0";
const POLL_INTERVAL_MS = 60_000;

export function AdminSidebar({
  userName,
}: {
  userName: string;
  companies?: CompanySelectorItem[];
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    const res = await getSystemNotificationsAction();
    if (res.success) setUnreadCount(res.unreadCount);
  }, []);

  useEffect(() => {
    // Leitura do ambiente APÓS a hidratação: localStorage, matchMedia, navigator e rede não existem no servidor,
    // então o estado inicial é o do servidor e o efeito o corrige na montagem. Trocar por useSyncExternalStore
    // aqui seria refatoração grande com risco real, para um padrão que é o aceito neste caso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    let timer: ReturnType<typeof setInterval> | null = null;

    // Pausa a consulta com a aba em segundo plano e busca uma vez ao voltar.
    // Antes era um intervalo de 15s rodando para sempre: com 5 abas abertas
    // por 8h de expediente, são 9.600 consultas por operador por dia para
    // atualizar um número que quase nunca muda.
    function start() {
      if (timer) return;
      timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    }
    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }
    function onVisibility() {
      if (document.hidden) {
        stop();
      } else {
        void load();
        start();
      }
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const groups: NavGroup[] = [
    {
      label: "Plataforma",
      items: [
        {
          href: "/admin",
          label: "Visão geral",
          icon: <LayoutDashboard className={ICON} />,
          exact: true,
        },
        {
          href: "/admin/relatorios",
          label: "Relatórios",
          icon: <BarChart2 className={ICON} />,
          keywords: "globais métricas metricas",
        },
        {
          href: "/admin/financeiro",
          label: "Financeiro",
          icon: <CreditCard className={ICON} />,
          keywords: "assinaturas receita mrr",
        },
        {
          href: "/admin/notificacoes",
          label: "Notificações",
          icon: <Bell className={ICON} />,
          keywords: "pedidos solicitações solicitacoes",
          // Sem `animate-pulse`: um contador piscando na periferia da tela
          // durante todo o expediente cansa e para de comunicar urgência.
          badge:
            unreadCount > 0 ? (
              <span
                className="badge badge-danger badge-count"
                aria-label={`${unreadCount} não lidas`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : undefined,
        },
      ],
    },
    {
      label: "Gestão",
      items: [
        {
          href: "/admin/companies",
          label: "Empresas",
          icon: <Building2 className={ICON} />,
          keywords: "clientes tenants",
        },
        {
          href: "/admin/users",
          label: "Usuários",
          icon: <Users className={ICON} />,
          keywords: "contas banir",
        },
        {
          href: "/admin/plans",
          label: "Planos",
          icon: <Gem className={ICON} />,
          keywords: "preços precos stripe billing",
        },
        {
          href: "/admin/modulos",
          label: "Módulos",
          icon: <Zap className={ICON} />,
          keywords: "add-ons extras licencas",
        },
        {
          href: "/admin/modulos/catalogo",
          label: "Catálogo de Add-ons",
          icon: <FileText className={ICON} />,
          keywords: "add-ons modulos tabela precos pdf apresentacao comercial",
        },
      ],
    },
    {
      label: "Catálogo",
      defaultCollapsed: true,
      items: [
        {
          href: "/admin/segments",
          label: "Segmentos",
          icon: <Tag className={ICON} />,
          keywords: "nichos ramos negócio negocio",
        },
        {
          href: "/admin/presets",
          label: "Presets",
          icon: <Star className={ICON} />,
          keywords: "serviços padrão servicos padrao",
        },
      ],
    },
    {
      label: "Sistema",
      defaultCollapsed: true,
      items: [
        {
          href: "/admin/infraestrutura",
          label: "Infraestrutura",
          icon: <Server className={ICON} />,
          keywords: "saúde saude banco redis",
        },
        {
          href: "/admin/changelog",
          label: "Changelog",
          icon: <Activity className={ICON} />,
          keywords: "releases versões versoes",
        },
        {
          href: "/admin/configuracoes",
          label: "Configurações",
          icon: <Settings className={ICON} />,
          keywords: "globais sessão sessao manutenção manutencao",
        },
      ],
    },
  ];

  const brand = (
    <Link
      href="/selecionar-empresa"
      title="Trocar de ambiente"
      className="flex items-center gap-2.5 p-2 rounded-[var(--radius-control)] hover:bg-[var(--color-bg-hover)] transition-colors group"
    >
      <span className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] flex items-center justify-center shrink-0">
        <KreatorIcon size={18} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className="block font-semibold text-[var(--color-text-heading)] truncate"
          style={{ fontSize: "var(--text-sm)" }}
        >
          Kreator
        </span>
        <span
          className="block text-[var(--color-text-muted)]"
          style={{ fontSize: "var(--text-xs)" }}
        >
          Super admin
        </span>
      </span>
      <ArrowRightLeft className="h-3.5 w-3.5 text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)] transition-colors shrink-0" />
    </Link>
  );

  const footer = (
    <div className="space-y-1">
      <div className="flex items-center gap-2.5 px-2 py-1">
        <span className="w-7 h-7 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text)] font-semibold flex items-center justify-center text-xs shrink-0">
          {userName ? userName[0].toUpperCase() : "A"}
        </span>
        <span
          className="font-medium text-[var(--color-text)] truncate"
          style={{ fontSize: "var(--text-sm)" }}
        >
          {userName}
        </span>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="nav-link w-full hover:!text-[var(--color-danger)]">
          <LogOut className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
          <span>Sair</span>
        </button>
      </form>
    </div>
  );

  return (
    <NavSidebar
      brand={brand}
      groups={groups}
      footer={footer}
      mobileTitle="Kreator Admin"
    />
  );
}
