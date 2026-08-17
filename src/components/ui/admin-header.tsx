"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Building2, ChevronDown, Search, ExternalLink } from "@/components/ui/icons";
import type { CompanySelectorItem } from "@/server/queries/admin";

type Props = {
  companies: CompanySelectorItem[];
};

export function AdminHeader({ companies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(slug: string) {
    setOpen(false);
    setSearch("");
    router.push(`/${slug}/dashboard`);
  }

  return (
    <header className="app-header sticky top-0 z-30 shrink-0 text-left">
      <div>
        <span className="text-xs font-bold text-primary uppercase tracking-wider block">
          Painel de Controle
        </span>
        <h2 className="text-sm font-extrabold text-text-heading">Plataforma Super Admin</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* SELETOR DE AMBIENTE */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-muted)] border border-[var(--color-border)] rounded-xl text-xs font-semibold text-[var(--color-text-heading)] transition-all cursor-pointer shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
            <span className="hidden sm:inline">Selecionar Ambiente</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-subtle)] transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[var(--color-border)] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Busca */}
              <div className="p-2 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-xl px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-[var(--color-text-subtle)] shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar empresa..."
                    className="flex-1 bg-transparent text-xs text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)] outline-none"
                  />
                </div>
              </div>

              {/* Lista */}
              <div className="max-h-72 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-subtle)] text-center py-6">
                    Nenhuma empresa encontrada
                  </p>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c.slug)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-bg-subtle)] transition-colors text-left cursor-pointer group"
                    >
                      {/* Avatar */}
                      <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center text-[11px] font-extrabold shrink-0 overflow-hidden">
                        {c.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          c.name[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--color-text-heading)] truncate">{c.name}</p>
                        <p className="text-[10px] text-[var(--color-text-subtle)] truncate">{c.slug}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-subtle)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))
                )}
              </div>

              {/* Footer info */}
              <div className="border-t border-[var(--color-border)] px-3 py-2">
                <p className="text-[10px] text-[var(--color-text-subtle)] text-center">
                  {companies.length} empresa{companies.length !== 1 ? "s" : ""} ativa{companies.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </div>

        <NotificationBell />
      </div>
    </header>
  );
}
