"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown, Menu, Search, X } from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Conteúdo à direita (ex.: badge de contagem) */
  badge?: React.ReactNode;
  /** Só ativo quando o pathname for exatamente igual (ex.: rota raiz) */
  exact?: boolean;
  /** Termos extras que também encontram este item no filtro */
  keywords?: string;
};

export type NavGroup = {
  /** Rótulo da seção (opcional) — renderizado como cabeçalho discreto */
  label?: string;
  items: NavItem[];
  /** Começa recolhido. Útil para seções acessadas com pouca frequência. */
  defaultCollapsed?: boolean;
};

/** Acima disso, o filtro aparece — abaixo, procurar com o olho é mais rápido. */
const FILTER_THRESHOLD = 12;

/**
 * Sidebar do painel.
 *
 * O menu tem ~26 destinos. Três coisas mantêm isso navegável:
 *  · seções recolhíveis, com o estado lembrado por navegador;
 *  · um filtro por texto que aparece só quando a lista é longa;
 *  · a seção do item ativo sempre abre, mesmo se o usuário a tinha fechado —
 *    ninguém deveria "sumir" do próprio menu ao navegar.
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
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const isActive = useCallback(
    (item: NavItem) =>
      item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(item.href + "/"),
    [pathname]
  );

  // Estado recolhido persiste por navegador
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kreator_nav_collapsed");
      if (raw) setCollapsed(JSON.parse(raw));
      else {
        const initial: Record<string, boolean> = {};
        for (const g of groups) if (g.label && g.defaultCollapsed) initial[g.label] = true;
        setCollapsed(initial);
      }
    } catch {
      // sem persistência; tudo aberto
    }
    // Só na montagem: `groups` é recriado a cada render do pai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleGroup = useCallback((label: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem("kreator_nav_collapsed", JSON.stringify(next));
      } catch {
        // idem
      }
      return next;
    });
  }, []);

  const totalItems = useMemo(
    () => groups.reduce((n, g) => n + g.items.length, 0),
    [groups]
  );

  const normalized = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    if (!normalized) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) =>
          `${it.label} ${it.keywords ?? ""}`.toLowerCase().includes(normalized)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, normalized]);

  // Fecha o drawer ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Drawer aberto: trava o scroll do fundo, fecha no Escape, devolve o foco
  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  const content = (
    <>
      {brand && <div className="px-1 pb-3 shrink-0">{brand}</div>}

      {totalItems > FILTER_THRESHOLD && (
        <div className="px-1 pb-3 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar menu"
              aria-label="Filtrar itens do menu"
              className="input pl-8"
              style={{ fontSize: "var(--text-xs)", paddingBlock: "0.4375rem" }}
            />
          </div>
        </div>
      )}

      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden -mx-1 px-1"
        aria-label="Navegação principal"
      >
        {visibleGroups.length === 0 && (
          <p
            className="px-2.5 py-6 text-center text-[var(--color-text-muted)]"
            style={{ fontSize: "var(--text-xs)" }}
          >
            Nada encontrado para “{query}”.
          </p>
        )}

        {visibleGroups.map((group, gi) => {
          // Um filtro ativo abre tudo; a seção do item atual nunca fica fechada.
          const hasActive = group.items.some(isActive);
          const isCollapsed =
            !normalized && !hasActive && !!group.label && !!collapsed[group.label];
          const groupId = `nav-group-${gi}`;

          return (
            <div key={group.label ?? gi} className={gi > 0 ? "mt-4" : ""}>
              {group.label && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label!)}
                  aria-expanded={!isCollapsed}
                  aria-controls={groupId}
                  className="nav-section-label w-full flex items-center justify-between gap-2 py-1 cursor-pointer hover:text-[var(--color-text-muted)] transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className="w-3 h-3 shrink-0 transition-transform"
                    style={{
                      transform: isCollapsed ? "rotate(-90deg)" : "none",
                      transitionDuration: "var(--dur-fast)",
                      transitionTimingFunction: "var(--ease-out)",
                    }}
                  />
                </button>
              )}

              {!isCollapsed && (
                <ul id={groupId} className="space-y-0.5" role="list">
                  {group.items.map((item) => {
                    const active = isActive(item);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "nav-link justify-between group/nav",
                            active && "nav-link-active"
                          )}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={cn(
                                "shrink-0 transition-colors",
                                active
                                  ? "text-[var(--color-primary)]"
                                  : "text-[var(--color-text-subtle)]"
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
              )}
            </div>
          );
        })}
      </nav>

      {footer && (
        <div className="border-t border-[var(--color-border)] pt-3 mt-3 shrink-0">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop — coluna fixa */}
      <aside className="app-sidebar hidden md:flex md:flex-col shrink-0 sticky top-0 h-dvh px-3 py-4 text-left">
        {content}
      </aside>

      {/* Mobile — cabeçalho + drawer */}
      <div className="md:hidden w-full">
        <div
          className="flex items-center justify-between bg-[var(--color-bg-sidebar)] px-4 py-3 border-b border-[var(--color-border)] sticky top-0"
          style={{ zIndex: "var(--z-sticky)" }}
        >
          <span
            className="font-semibold text-[var(--color-text-heading)] truncate"
            style={{ fontSize: "var(--text-sm)" }}
          >
            {mobileTitle}
          </span>
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Abrir menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="btn btn-ghost btn-icon btn-sm"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 flex" style={{ zIndex: "var(--z-drawer)" }}>
            {/* Scrim: some antes do painel na saída, então o fundo volta rápido */}
            <div
              className="absolute inset-0 bg-black/45 animate-[fade-in_var(--dur-fast)_var(--ease-out)]"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside
              ref={drawerRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Menu de navegação"
              className="app-sidebar relative w-[17.5rem] max-w-[85%] h-full px-3 py-4 flex flex-col text-left overflow-y-auto outline-none animate-[slide-in-left_var(--dur-slow)_var(--ease-drawer)]"
              style={{ boxShadow: "var(--shadow-xl)" }}
            >
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setMobileOpen(false)}
                className="btn btn-ghost btn-icon btn-sm absolute right-2.5 top-2.5 z-10"
              >
                <X className="h-4 w-4" />
              </button>
              {content}
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
