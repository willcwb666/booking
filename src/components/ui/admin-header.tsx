"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/ui/notification-bell";
import {
  Building2,
  ChevronDown,
  ExternalLink,
  Search,
} from "@/components/ui/icons";
import type { CompanySelectorItem } from "@/server/queries/admin";

type Props = {
  companies: CompanySelectorItem[];
};

/**
 * Cabeçalho do super admin.
 *
 * Removido daqui: o selo "Sistemas 100% Operacionais". Ele era texto fixo, não
 * vinha de nenhuma verificação — a interface afirmava que estava tudo bem
 * mesmo com o banco fora. Indicador de saúde só volta quando houver uma
 * checagem real por trás.
 */
export function AdminHeader({ companies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [companies, search]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSelect(slug: string) {
    setOpen(false);
    setSearch("");
    router.push(`/${slug}/dashboard`);
  }

  return (
    <header className="app-header shrink-0">
      <div className="min-w-0">
        <p className="eyebrow">Super admin</p>
        <h2
          className="font-semibold text-[var(--color-text-heading)] truncate"
          style={{ fontSize: "var(--text-md)" }}
        >
          Plataforma
        </h2>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative" ref={wrapRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="btn btn-secondary btn-sm"
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Acessar empresa</span>
            <ChevronDown
              className="w-3.5 h-3.5 shrink-0 transition-transform"
              style={{
                transform: open ? "rotate(180deg)" : "none",
                transitionDuration: "var(--dur-fast)",
                transitionTimingFunction: "var(--ease-out)",
              }}
            />
          </button>

          {open && (
            <div
              role="listbox"
              aria-label="Empresas"
              className="absolute right-0 top-full mt-1.5 w-[18rem] card card-lg overflow-hidden"
              style={{
                zIndex: "var(--z-overlay)",
                boxShadow: "var(--shadow-lg)",
                animation: "pop-in var(--dur-fast) var(--ease-out)",
                // Popover escala a partir do gatilho (canto superior direito),
                // não do centro — é de lá que ele está "saindo".
                transformOrigin: "top right",
              }}
            >
              <div className="p-2 border-b border-[var(--color-border)]">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)] pointer-events-none" />
                  <input
                    autoFocus
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou slug"
                    aria-label="Buscar empresa"
                    className="input pl-8"
                    style={{ fontSize: "var(--text-xs)", paddingBlock: "0.4375rem" }}
                  />
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto p-1">
                {filtered.length === 0 ? (
                  <p
                    className="text-[var(--color-text-muted)] text-center py-6"
                    style={{ fontSize: "var(--text-xs)" }}
                  >
                    Nenhuma empresa encontrada.
                  </p>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => handleSelect(c.slug)}
                      className="nav-link w-full justify-between text-left group/item"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-[var(--radius-sm)] bg-[var(--color-bg-muted)] text-[var(--color-text-heading)] flex items-center justify-center text-[var(--text-2xs)] font-semibold shrink-0 overflow-hidden">
                          {c.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.logoUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            c.name[0].toUpperCase()
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[var(--color-text-heading)]">
                            {c.name}
                          </span>
                          <span
                            className="block truncate mono text-[var(--color-text-subtle)]"
                            style={{ fontSize: "var(--text-2xs)" }}
                          >
                            /{c.slug}
                          </span>
                        </span>
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-subtle)]" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <NotificationBell />
      </div>
    </header>
  );
}
