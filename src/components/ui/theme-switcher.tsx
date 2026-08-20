"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Palette, X } from "@/components/ui/icons";

export type ThemeId =
  | "neo-2026"
  | "warm-craft"
  | "slate-emerald"
  | "nordic-minimal"
  | "default";

type ThemeOption = {
  id: ThemeId;
  name: string;
  audience: string;
  swatch: string;
};

/**
 * O tema define o acento da interface. A aplicação é somente clara — não há
 * modo escuro, por decisão de produto.
 */
const THEMES: ThemeOption[] = [
  { id: "default", name: "Console", audience: "Padrão · cobalto", swatch: "#2555e0" },
  { id: "neo-2026", name: "Neo", audience: "Índigo elétrico", swatch: "#4f46e5" },
  { id: "warm-craft", name: "Warm Craft", audience: "Barbearias e spas", swatch: "#b4640a" },
  { id: "slate-emerald", name: "Emerald", audience: "Limpeza e saúde", swatch: "#04785c" },
  { id: "nordic-minimal", name: "Nordic", audience: "Monocromático", swatch: "#18181b" },
];

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("default");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // O tema já foi aplicado pelo script inline do layout antes da primeira
  // pintura; aqui só sincronizamos o estado do React com o que está no DOM.
  useEffect(() => {
    // Leitura do ambiente APÓS a hidratação: localStorage, matchMedia, navigator e rede não existem no servidor,
    // então o estado inicial é o do servidor e o efeito o corrige na montagem. Trocar por useSyncExternalStore
    // aqui seria refatoração grande com risco real, para um padrão que é o aceito neste caso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      setTheme((localStorage.getItem("kreator_theme") as ThemeId) || "default");
    } catch {
      // localStorage bloqueado — segue com os padrões
    }
  }, []);

  // Fecha com Escape e ao clicar fora
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isOpen]);

  const applyTheme = useCallback((id: ThemeId) => {
    const root = document.documentElement;
    if (id === "default") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", id);
    setTheme(id);
    try {
      localStorage.setItem("kreator_theme", id);
    } catch {
      // preferência não persiste, mas a sessão atual funciona
    }
  }, []);

  if (!mounted) return null;

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div
      className="fixed bottom-4 right-4 font-sans"
      style={{ zIndex: "var(--z-dock)" }}
    >
      {isOpen ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Aparência"
          className="w-[19rem] card card-lg overflow-hidden"
          style={{ boxShadow: "var(--shadow-xl)" }}
        >
          <div className="card-header">
            <div>
              <p className="card-title" style={{ fontSize: "var(--text-md)" }}>
                Aparência
              </p>
              <p
                className="text-[var(--color-text-muted)] mt-0.5"
                style={{ fontSize: "var(--text-xs)" }}
              >
                Vale só para este navegador.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar"
              className="btn btn-ghost btn-icon btn-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="card-body space-y-4">
            <div>
              <p className="eyebrow mb-2">Cor de destaque</p>
              <div className="flex flex-col gap-1">
                {THEMES.map((t) => {
                  const selected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTheme(t.id)}
                      aria-pressed={selected}
                      className="nav-link w-full justify-between text-left"
                      style={
                        selected
                          ? {
                              background: "var(--color-primary-light)",
                              color: "var(--color-primary)",
                            }
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-2.5 min-w-0">
                        <span
                          aria-hidden="true"
                          className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-black/10"
                          style={{ backgroundColor: t.swatch }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {t.name}
                          </span>
                          <span
                            className="block truncate text-[var(--color-text-subtle)]"
                            style={{ fontSize: "var(--text-xs)" }}
                          >
                            {t.audience}
                          </span>
                        </span>
                      </span>
                      {selected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label={`Aparência: ${current.name}`}
          className="btn btn-secondary btn-sm btn-tactile"
          style={{ boxShadow: "var(--shadow-md)" }}
        >
          <span
            aria-hidden="true"
            className="w-3 h-3 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: current.swatch }}
          />
          <Palette className="w-3.5 h-3.5" />
          <span>Aparência</span>
        </button>
      )}
    </div>
  );
}
