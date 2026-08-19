"use client";

import { useEffect, useState } from "react";

/**
 * Cores dos gráficos lidas do design system em tempo de execução.
 *
 * Recharts escreve `stroke`/`fill` como atributos SVG, e atributo XML não
 * resolve `var(--x)` — passar o token direto renderiza preto. Então lemos o
 * valor calculado das variáveis do `:root` e devolvemos hex/rgb de verdade.
 *
 * Como o app troca o acento por `data-theme` no `<html>`, um MutationObserver
 * relê os tokens quando o tema muda; sem isso o gráfico ficaria com a cor do
 * tema anterior até o próximo recarregamento.
 */

export type ChartTheme = {
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  navy: string;
  grid: string;
  axis: string;
  surface: string;
  border: string;
  text: string;
  /** Paleta categórica, na ordem em que deve ser consumida. */
  categorical: string[];
};

const TOKENS: Record<keyof Omit<ChartTheme, "categorical">, string> = {
  accent: "--color-primary",
  accentSoft: "--color-primary-muted",
  success: "--color-success",
  warning: "--color-warning",
  danger: "--color-danger",
  info: "--color-info",
  navy: "--color-navy",
  grid: "--color-border",
  axis: "--color-text-subtle",
  surface: "--color-bg",
  border: "--color-border",
  text: "--color-text-heading",
};

/** Usado no primeiro render do servidor, antes de o CSS estar disponível. */
const FALLBACK: ChartTheme = {
  accent: "#2555e0",
  accentSoft: "#b9c9f5",
  success: "#1a7f52",
  warning: "#b26a00",
  danger: "#c0392f",
  info: "#2555e0",
  navy: "#1b2a4a",
  grid: "#e5e7eb",
  axis: "#8a8f98",
  surface: "#ffffff",
  border: "#e5e7eb",
  text: "#16181d",
  categorical: ["#2555e0", "#1a7f52", "#b26a00", "#1b2a4a", "#c0392f", "#6b7280"],
};

function read(): ChartTheme {
  if (typeof window === "undefined") return FALLBACK;
  const cs = getComputedStyle(document.documentElement);
  const get = (token: string, fallback: string) => {
    const v = cs.getPropertyValue(token).trim();
    return v || fallback;
  };

  const theme = {} as ChartTheme;
  for (const [key, token] of Object.entries(TOKENS) as [
    keyof typeof TOKENS,
    string,
  ][]) {
    theme[key] = get(token, FALLBACK[key]);
  }

  // Ordem pensada para leitura em série: o acento primeiro, depois os
  // semânticos, e um neutro no fim para a categoria "resto".
  theme.categorical = [
    theme.accent,
    theme.success,
    theme.warning,
    theme.navy,
    theme.danger,
    theme.axis,
  ];
  return theme;
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(FALLBACK);

  useEffect(() => {
    setTheme(read());

    const observer = new MutationObserver(() => setTheme(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

/** Respeita `prefers-reduced-motion` desligando a animação de entrada. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
