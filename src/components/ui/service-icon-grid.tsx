"use client";

import React, { useMemo, useState } from "react";
import { icons } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { Search, X } from "@/components/ui/icons";
import { SEARCH_ALIASES, kebabToPascal, normalizeStr } from "@/components/ui/service-icon-shared";

// Canonical kebab-case names (from dynamicIconImports) that also have a static
// component in the `icons` map — guarantees the stored value renders both here
// (static grid) and on public pages (via DynamicIcon).
const ALL_ICONS: Array<{ name: string; Comp: React.ComponentType<any> }> = Object.keys(dynamicIconImports)
  .map((name) => ({ name, Comp: (icons as any)[kebabToPascal(name)] as React.ComponentType<any> }))
  .filter((i) => Boolean(i.Comp))
  .sort((a, b) => a.name.localeCompare(b.name));

const MAX_RENDER = 200;

type Props = {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
  onClose: () => void;
};

export default function ServiceIconGrid({ selectedIcon, onSelect, onClose }: Props) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const q = normalizeStr(searchTerm);
    if (!q) return ALL_ICONS;
    const aliasMatches = SEARCH_ALIASES[q] || [];
    return ALL_ICONS.filter(
      (item) => item.name.includes(q) || aliasMatches.includes(item.name)
    );
  }, [searchTerm]);

  const visible = filtered.slice(0, MAX_RENDER);

  return (
    <div className="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-panel)] space-y-3 shadow-xl animate-in fade-in duration-200 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-2xs)] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          CATÁLOGO LUCIDE ({ALL_ICONS.length} ÍCONES)
        </span>
        <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)]">
          {filtered.length} encontrado(s)
          {filtered.length > MAX_RENDER && ` — refine a busca`}
        </span>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-[var(--color-text-subtle)] absolute left-3.5 top-3" />
        <input
          type="text"
          autoFocus
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Busque em português ou inglês (ex: stove, fogão, fridge, geladeira, dente, camera, tesoura)..."
          className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] pl-10 pr-9 py-2.5 text-xs font-medium focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-3 text-[var(--color-text-subtle)] hover:text-[var(--color-text-muted)] font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-6 text-center bg-[var(--color-bg-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border)] space-y-1">
          <p className="font-bold text-[var(--color-text)] text-xs">Nenhum ícone encontrado para &quot;{searchTerm}&quot;</p>
          <p className="text-[var(--text-2xs)] text-[var(--color-text-subtle)]">
            Tente outro termo (ex: refrigerator, hard-hat, camera, dumbbell, coffee) ou em português.
          </p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto pr-1">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
            {visible.map(({ name, Comp }) => {
              const isSelected = selectedIcon === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onSelect(name);
                    onClose();
                  }}
                  title={name}
                  className={`p-2 rounded-[var(--radius-control)] border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center aspect-square ${
                    isSelected
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm font-semibold scale-105"
                      : "bg-[var(--color-bg)] border-[var(--color-border)] hover:bg-[var(--color-primary-light)] hover:border-[var(--color-primary)] text-[var(--color-text)]"
                  }`}
                >
                  <Comp className="w-4 h-4 shrink-0" />
                  <span className="text-[var(--text-2xs)] font-bold truncate max-w-full leading-tight">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
