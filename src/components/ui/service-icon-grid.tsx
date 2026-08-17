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
    <div className="p-4 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xl animate-in fade-in duration-200 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          CATÁLOGO LUCIDE ({ALL_ICONS.length} ÍCONES)
        </span>
        <span className="text-[10px] text-slate-400">
          {filtered.length} encontrado(s)
          {filtered.length > MAX_RENDER && ` — refine a busca`}
        </span>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          autoFocus
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Busque em português ou inglês (ex: stove, fogão, fridge, geladeira, dente, camera, tesoura)..."
          className="w-full border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-6 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
          <p className="font-bold text-slate-700 text-xs">Nenhum ícone encontrado para &quot;{searchTerm}&quot;</p>
          <p className="text-[11px] text-slate-400">
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
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center aspect-square ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-extrabold scale-105"
                      : "bg-white border-slate-200/90 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700"
                  }`}
                >
                  <Comp className="w-4 h-4 shrink-0" />
                  <span className="text-[9px] font-bold truncate max-w-full leading-tight">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
