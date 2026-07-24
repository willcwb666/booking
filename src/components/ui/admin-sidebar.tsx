"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/server/actions/auth";
import { KreatorIcon } from "@/components/ui/kreator-logo";
import { Bell, Settings } from "@/components/ui/icons";
import { getSystemNotificationsAction } from "@/server/actions/notifications-system";

type NavItem = { href: string; label: string; icon: React.ReactNode; isNotification?: boolean };

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9h1" /><path d="M9 13h1" /><path d="M9 17h1" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCreditCard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotificationsCount() {
      const res = await getSystemNotificationsAction();
      if (res.success) {
        setUnreadCount(res.unreadCount);
      }
    }
    loadNotificationsCount();
    const interval = setInterval(loadNotificationsCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    { href: "/admin", label: "Visão geral", icon: <IconGrid /> },
    { href: "/admin/notificacoes", label: "Notificações & Pedidos", icon: <Bell className="w-4.5 h-4.5" />, isNotification: true },
    { href: "/admin/financeiro", label: "Financeiro & Assinaturas", icon: <IconCreditCard /> },
    { href: "/admin/companies", label: "Empresas", icon: <IconBuilding /> },
    { href: "/admin/segments", label: "Segmentos de Negócio", icon: <IconBuilding /> },
    { href: "/admin/presets", label: "Presets de Nichos", icon: <IconCreditCard /> },
    { href: "/admin/users", label: "Usuários", icon: <IconUsers /> },
    { href: "/admin/plans", label: "Planos", icon: <IconCreditCard /> },
    { href: "/admin/configuracoes", label: "Configurações Globais", icon: <Settings className="w-4.5 h-4.5" /> },
  ];

  return (
    <aside className="w-60 shrink-0 bg-slate-50/90 text-slate-800 border-r border-slate-200/80 flex flex-col h-screen sticky top-0 backdrop-blur-xs text-left">
      <div className="px-5 py-5 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <KreatorIcon size={32} />
          <div>
            <p className="text-sm font-extrabold text-slate-900 tracking-tight">Kreator Admin</p>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded font-bold">
              Super Admin
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto" aria-label="Navegação admin">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                    isActive
                      ? "bg-indigo-50/90 text-indigo-600 font-bold border-r-2 border-indigo-600 shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? "text-indigo-600" : "text-slate-400"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.isNotification && unreadCount > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 py-4 border-t border-slate-200/80">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-700 truncate">{userName}</p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
              aria-label="Sair da conta"
            >
              <IconLogout />
              Sair
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
