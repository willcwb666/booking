"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Conteúdo à direita (ex.: badge de contagem) */
  badge?: React.ReactNode;
  /** Só ativo quando o pathname for exatamente igual (ex.: rota raiz) */
  exact?: boolean;
};

export type NavGroup = {
  /** Rótulo da seção (opcional) — renderizado como cabeçalho discreto */
  label?: string;
  items: NavItem[];
};

/**
 * Sidebar reutilizável e estável (sempre expandida, largura fixa via
 * `.app-sidebar`), com agrupamento de seções no estilo do Stripe Dashboard.
 * Usada tanto pelo painel do gestor quanto pelo admin. Em telas pequenas vira
 * um drawer acionado por um cabeçalho com botão de menu.
 */
export function NavSidebar({
  brand,
  groups,
  footer,
  mobileTitle = "Menu",
}: {
  brand?: React.ReactNode;
  groups: NavGroup[];
  footer?: React.ReactNode;
  mobileTitle?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

  const content = (
    <>
      {brand && <div className="px-1 pb-4 shrink-0">{brand}</div>}

      <nav className="flex-1 overflow-y-auto overflow-x-hidden -mx-1 px-1" aria-label="Navegação">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.label && (
              <p className="px-2.5 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)]">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5" role="list">
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn("nav-link justify-between group/nav", active && "nav-link-active")}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            "shrink-0 transition-colors",
                            active
                              ? "text-[var(--color-primary)]"
                              : "text-[var(--color-text-subtle)] group-hover/nav:text-[var(--color-primary)]"
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.badge}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {footer && <div className="border-t border-[var(--color-border)] pt-3 mt-3 shrink-0">{footer}</div>}
    </>
  );

  return (
    <>
      {/* Desktop: sidebar fixa, sempre expandida */}
      <aside className="app-sidebar hidden md:flex md:flex-col shrink-0 sticky top-0 h-screen px-3 py-4 text-left">
        {content}
      </aside>

      {/* Mobile: cabeçalho com botão de menu + drawer */}
      <div className="md:hidden w-full">
        <div className="flex items-center justify-between bg-[var(--color-bg-sidebar)] px-4 py-3 border-b border-[var(--color-border)] sticky top-0 z-40">
          <span className="font-bold text-[var(--color-text-heading)] text-sm">{mobileTitle}</span>
          <button
            type="button"
            aria-label="Abrir menu lateral"
            onClick={() => setMobileOpen(true)}
            className="p-1 text-[var(--color-text)] hover:text-[var(--color-primary)] cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-[100] flex">
            <div className="absolute inset-0 bg-black/40 animate-fadeIn" onClick={() => setMobileOpen(false)} />
            <aside className="app-sidebar relative w-[280px] max-w-[85%] h-full px-3 py-4 flex flex-col text-left overflow-y-auto shadow-[var(--shadow-lg)]">
              <button
                type="button"
                aria-label="Fechar menu lateral"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 z-10 text-[var(--color-text-subtle)] hover:text-[var(--color-text-heading)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              {content}
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
