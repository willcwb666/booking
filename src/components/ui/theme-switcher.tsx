"use client";

import React, { useState, useEffect } from "react";
import { Palette, Check, Sparkles, X, ChevronUp, ChevronDown } from "lucide-react";

export type ThemeId =
  | "neo-2026"
  | "warm-craft"
  | "slate-emerald"
  | "nordic-minimal"
  | "default";

interface ThemeOption {
  id: ThemeId;
  name: string;
  badge: string;
  description: string;
  primaryColor: string;
  bgColor: string;
  textColor: string;
}

const THEMES: ThemeOption[] = [
  {
    id: "neo-2026",
    name: "Neo 2026 (Recomendado)",
    badge: "2026 Design",
    description: "Cores modernas, contraste impecável, botões ultra intuitivos e navegação rápida.",
    primaryColor: "#4f46e5",
    bgColor: "#f8fafc",
    textColor: "#090d16",
  },
  {
    id: "warm-craft",
    name: "Warm Craft & Amber",
    badge: "Barbearias & Spas",
    description: "Tons quentes de âmbar e bronze com acolhimento e sofisticação premium.",
    primaryColor: "#d97706",
    bgColor: "#faf8f5",
    textColor: "#1c1917",
  },
  {
    id: "slate-emerald",
    name: "Slate & Emerald Mint",
    badge: "Limpeza & Bem-estar",
    description: "Verde esmeralda nítido, sensação de frescor, limpeza e organização cirúrgica.",
    primaryColor: "#059669",
    bgColor: "#f4f9f6",
    textColor: "#0f172a",
  },
  {
    id: "nordic-minimal",
    name: "Nordic Minimalist",
    badge: "Foco Puro",
    description: "Visual monocromático refinado com tipografia nítida e zero distrações visuais.",
    primaryColor: "#18181b",
    bgColor: "#ffffff",
    textColor: "#09090b",
  },
  {
    id: "default",
    name: "Stripe Clássico",
    badge: "Original",
    description: "O layout e paleta originais (Indigo & Navy) preservados 100% sem alterações.",
    primaryColor: "#635bff",
    bgColor: "#f6f9fc",
    textColor: "#0a2540",
  },
];

export function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>("neo-2026");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem("kreator_theme") as ThemeId) || "neo-2026";
    setCurrentTheme(saved);
    applyTheme(saved);
  }, []);

  function applyTheme(themeId: ThemeId) {
    if (themeId === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", themeId);
    }
  }

  function handleSelectTheme(themeId: ThemeId) {
    setCurrentTheme(themeId);
    localStorage.setItem("kreator_theme", themeId);
    applyTheme(themeId);
  }

  if (!mounted) return null;

  const currentOption = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {/* Botão Gatilho Flutuante */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-full shadow-2xl backdrop-blur-md border border-slate-700/80 transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold ring-1 ring-white/10"
        >
          <div
            className="w-3.5 h-3.5 rounded-full ring-2 ring-white/40 shrink-0"
            style={{ backgroundColor: currentOption.primaryColor }}
          />
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tema: {currentOption.name.split(" ")[0]}</span>
          </span>
          <span className="px-1.5 py-0.5 bg-white/15 text-[10px] rounded-md uppercase font-extrabold tracking-wider">
            Trocar
          </span>
        </button>
      ) : (
        /* Painel Completo de Seleção de Temas */
        <div className="w-84 sm:w-96 bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-2xl border border-slate-200/90 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200 ring-1 ring-black/5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Alternador de Temas</h4>
                <p className="text-[11px] text-slate-500 font-medium">Teste estilos visuais em tempo real</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lista de Temas */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {THEMES.map((theme) => {
              const isSelected = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? "bg-slate-50/90 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20"
                      : "bg-white hover:bg-slate-50/60 border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  {/* Amostra de Cor */}
                  <div
                    className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-xs border border-black/10 mt-0.5"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-extrabold text-xs text-slate-900 truncate">
                        {theme.name}
                      </p>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {theme.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug mt-1 line-clamp-2">
                      {theme.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dica no Rodapé */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>✨ Salvo automaticamente</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-indigo-600 hover:text-indigo-800 font-bold"
            >
              Fechar Painel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
