"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { logoutAction } from "@/server/actions/auth";
import { KreatorIcon } from "@/components/ui/kreator-logo";
import {
  Bell,
  Settings,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Tag,
  LogOut,
  FileText,
  Shield,
  ArrowRightLeft,
} from "@/components/ui/icons";
import { NavSidebar, type NavGroup } from "@/components/ui/nav-sidebar";
import { getSystemNotificationsAction } from "@/server/actions/notifications-system";
import type { CompanySelectorItem } from "@/server/queries/admin";

const ICON = "h-4 w-4 shrink-0";

export function AdminSidebar({
  userName,
  companies = [],
}: {
  userName: string;
  companies?: CompanySelectorItem[];
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotificationsCount() {
      const res = await getSystemNotificationsAction();
      if (res.success) setUnreadCount(res.unreadCount);
    }
    loadNotificationsCount();
    const interval = setInterval(loadNotificationsCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const groups: NavGroup[] = [
    {
      label: "Plataforma",
      items: [
        { href: "/admin", label: "Visão geral", icon: <LayoutDashboard className={ICON} />, exact: true },
        { href: "/admin/relatorios", label: "Relatórios Globais", icon: <FileText className={ICON} /> },
        {
          href: "/admin/notificacoes",
          label: "Notificações & Pedidos",
          icon: <Bell className={ICON} />,
          badge:
            unreadCount > 0 ? (
              <span className="badge badge-danger animate-pulse">{unreadCount > 9 ? "9+" : unreadCount}</span>
            ) : undefined,
        },
        { href: "/admin/financeiro", label: "Financeiro & Assinaturas", icon: <CreditCard className={ICON} /> },
      ],
    },
    {
      label: "Gestão",
      items: [
        { href: "/admin/companies", label: "Empresas", icon: <Building2 className={ICON} /> },
        { href: "/admin/users", label: "Usuários", icon: <Users className={ICON} /> },
        { href: "/admin/plans", label: "Planos", icon: <CreditCard className={ICON} /> },
        { href: "/admin/modulos", label: "Módulos Extras", icon: <Tag className={ICON} /> },
      ],
    },
    {
      label: "Catálogo",
      items: [
        { href: "/admin/segments", label: "Segmentos de Negócio", icon: <Building2 className={ICON} /> },
        { href: "/admin/presets", label: "Presets de Nichos", icon: <Tag className={ICON} /> },
      ],
    },
    {
      label: "Sistema",
      items: [
        { href: "/admin/infraestrutura", label: "Infraestrutura & Saúde", icon: <Shield className={ICON} /> },
        { href: "/admin/changelog", label: "Changelog & Releases", icon: <Tag className={ICON} /> },
        { href: "/admin/configuracoes", label: "Configurações Globais", icon: <Settings className={ICON} /> },
      ],
    },
  ];

  const brand = (
    <Link
      href="/selecionar-empresa"
      title="Trocar de empresa / Selecionar ambiente"
      className="flex items-center gap-3 p-2 rounded-2xl bg-[var(--color-bg)] hover:bg-[var(--color-bg-hover)] transition-all border border-[var(--color-border)] shadow-[var(--shadow-xs)] group cursor-pointer"
    >
      <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] text-white font-extrabold flex items-center justify-center shrink-0 overflow-hidden text-xs shadow-[var(--shadow-xs)]">
        <KreatorIcon size={20} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-xs font-bold text-[var(--color-text-heading)] truncate">Kreator Admin</p>
        <span className="text-[10px] text-[var(--color-primary)] font-semibold block">Super Admin</span>
      </div>
      <ArrowRightLeft className="h-3.5 w-3.5 text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)] transition-colors shrink-0" />
    </Link>
  );

  const footer = (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-2">
        <div className="w-7 h-7 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text)] font-bold flex items-center justify-center text-xs shrink-0">
          {userName ? userName[0].toUpperCase() : "A"}
        </div>
        <span className="text-xs font-semibold text-[var(--color-text)] truncate text-left">{userName}</span>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-2.5 py-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
          <span>Sair da conta</span>
        </button>
      </form>
    </div>
  );

  return <NavSidebar brand={brand} groups={groups} footer={footer} mobileTitle="Kreator Admin" />;
}

