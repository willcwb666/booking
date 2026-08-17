"use client";

import React, { useState } from "react";
import nextDynamic from "next/dynamic";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Search } from "@/components/ui/icons";
import { SEARCH_ALIASES, normalizeStr } from "@/components/ui/service-icon-shared";

// Heavy grid (imports the full Lucide static map) only loads when the user opens
// the picker — keeps the service form light.
const ServiceIconGrid = nextDynamic(() => import("@/components/ui/service-icon-grid"), {
  ssr: false,
  loading: () => (
    <div className="p-6 mt-2 bg-white border border-slate-200 rounded-3xl text-center text-xs text-slate-400">
      Carregando catálogo de ícones…
    </div>
  ),
});

const DEFAULT_ICON = "scissors";

/** Resolve a stored value (canonical kebab name, or a PT/EN alias) to a Lucide icon name. */
function resolveIconName(iconName?: string | null): string {
  if (!iconName) return DEFAULT_ICON;
  const trimmed = iconName.trim();
  const lower = normalizeStr(trimmed);
  const alias = SEARCH_ALIASES[lower];
  if (alias && alias.length > 0) return alias[0];
  // Legacy PascalCase values ("Scissors") → kebab ("scissors")
  return trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])([0-9])/g, "$1-$2")
    .toLowerCase();
}

export function RenderServiceIcon({
  iconName,
  className = "w-4 h-4",
}: {
  iconName?: string | null;
  className?: string;
}) {
  const name = resolveIconName(iconName);
  return (
    <DynamicIcon
      name={name as IconName}
      className={className}
      fallback={() => <DynamicIcon name={DEFAULT_ICON as IconName} className={className} />}
    />
  );
}

type Props = {
  selectedIcon: string;
  onSelectIcon: (iconKey: string) => void;
};

export function ServiceIconPicker({ selectedIcon, onSelectIcon }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2 text-xs">
      <label className="block font-bold text-slate-700 uppercase">ÍCONE DO SERVIÇO</label>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex-1">
          <div className="w-8 h-8 rounded-xl bg-[#635bff] text-white flex items-center justify-center shrink-0 shadow-xs">
            <RenderServiceIcon iconName={selectedIcon} className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 block text-xs">{selectedIcon}</span>
            <span className="text-[10px] text-slate-400 font-mono">Ícone Lucide: {selectedIcon}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-2xl transition-all cursor-pointer inline-flex items-center gap-2 uppercase shrink-0"
        >
          <Search className="w-4 h-4" />
          <span>{isOpen ? "FECHAR" : "BUSCAR ÍCONE"}</span>
        </button>
      </div>

      <input type="hidden" name="icon" value={selectedIcon} />

      {isOpen && (
        <ServiceIconGrid
          selectedIcon={selectedIcon}
          onSelect={onSelectIcon}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
