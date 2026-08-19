"use client";

import React, { useState } from "react";
import type { ChangelogRelease } from "@/server/actions/changelog";
import { Sparkles, Calendar, CheckCircle2, Tag, ArrowRight } from "@/components/ui/icons";

type Props = {
  releases: ChangelogRelease[];
};

export function ChangelogView({ releases }: Props) {
  const [selectedVersion, setSelectedVersion] = useState<string>(
    releases[0]?.version || ""
  );

  const activeRelease = releases.find((r) => r.version === selectedVersion) || releases[0];

  if (!releases || releases.length === 0) {
    return (
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
        Nenhum registro de atualização encontrado no CHANGELOG.md.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl px-6 sm:px-10 py-8 text-left space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-xs">
          <Sparkles className="w-4 h-4" />
          <span>Histórico de Evolução & Release Notes</span>
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-text-heading)] tracking-tight mt-1">
          Notas de Atualização do Sistema (Changelog)
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Acompanhe todas as novidades, melhorias de UX/UI, novas funcionalidades e correções de bugs lançadas no SaaS.
        </p>
      </div>

      {/* LISTBOX DE SELEÇÃO DE VERSÃO / DATA (Default na Última Atualização) */}
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-primary)]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <label className="block text-[var(--text-2xs)] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Selecione a Versão / Data da Release:
            </label>
            <span className="text-xs text-[var(--color-text-muted)] font-medium">
              Última atualização selecionada por padrão
            </span>
          </div>
        </div>

        {/* SELECT / LISTBOX DE DATAS E VERSÕES */}
        <select
          value={selectedVersion}
          onChange={(e) => setSelectedVersion(e.target.value)}
          className="bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-[var(--radius-control)] px-4 py-2.5 text-xs font-semibold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer min-w-[280px]"
        >
          {releases.map((rel, idx) => (
            <option key={rel.version} value={rel.version}>
              {idx === 0 ? `🌟 ${rel.version} (${rel.date}) — Atual` : `📦 ${rel.version} (${rel.date})`}
            </option>
          ))}
        </select>
      </div>

      {/* DETALHES DA RELEASE SELECIONADA */}
      {activeRelease && (
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-[var(--color-primary-light)] text-[var(--color-primary)] px-3 py-1 rounded-full">
                  {activeRelease.version}
                </span>
                <span className="text-xs font-bold text-[var(--color-text-muted)]">
                  Lançado em {activeRelease.date}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text-heading)] mt-2">
                {activeRelease.title}
              </h2>
            </div>

            <span className="text-xs font-bold text-[var(--color-success)] bg-[var(--color-success-light)] border border-[var(--color-success-border)] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Versão Estável em Produção
            </span>
          </div>

          {/* Destaques da Release em Formatagem Limpa */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
              Principais Melhorias & Implementações desta Versão:
            </h3>

            <div className="bg-[var(--color-bg-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border)] p-5 space-y-3 text-xs text-[var(--color-text)] font-medium leading-relaxed">
              <pre className="whitespace-pre-wrap font-sans text-xs text-[var(--color-text)] space-y-2">
                {activeRelease.rawContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
