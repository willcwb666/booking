"use client";

import React, { useState, useEffect } from "react";
import { logoutAction } from "@/server/actions/auth";
import { KreatorIcon } from "@/components/ui/kreator-logo";
import { Bell, Settings, LayoutDashboard, Building2, Users, CreditCard, Tag, LogOut } from "@/components/ui/icons";
import { NavSidebar, type NavGroup } from "@/components/ui/nav-sidebar";
import { getSystemNotificationsAction } from "@/server/actions/notifications-system";

const ICON = "h-4 w-4 shrink-0";

export function AdminSidebar({ userName }: { userName: string }) {
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
      items: [{ href: "/admin/configuracoes", label: "Configurações Globais", icon: <Settings className={ICON} /> }],
    },
  ];

  const brand = (
    <div className="flex items-center gap-2.5 px-1">
      <KreatorIcon size={32} />
      <div>
        <p className="text-sm font-extrabold text-[var(--color-text-heading)] tracking-tight">Kreator Admin</p>
        <span className="badge badge-primary">Super Admin</span>
      </div>
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between gap-2 px-1">
      <p className="text-xs font-semibold text-[var(--color-text)] truncate">{userName}</p>
      <form action={logoutAction}>
        <button
          type="submit"
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
          aria-label="Sair da conta"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </form>
    </div>
  );

  return <NavSidebar brand={brand} groups={groups} footer={footer} mobileTitle="Kreator Admin" />;
}
