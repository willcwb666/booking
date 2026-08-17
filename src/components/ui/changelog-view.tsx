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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center text-slate-500">
        Nenhum registro de atualização encontrado no CHANGELOG.md.
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl px-6 sm:px-10 py-8 text-left space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
          <Sparkles className="w-4 h-4" />
          <span>Histórico de Evolução & Release Notes</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
          Notas de Atualização do Sistema (Changelog)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Acompanhe todas as novidades, melhorias de UX/UI, novas funcionalidades e correções de bugs lançadas no SaaS.
        </p>
      </div>

      {/* LISTBOX DE SELEÇÃO DE VERSÃO / DATA (Default na Última Atualização) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Selecione a Versão / Data da Release:
            </label>
            <span className="text-xs text-slate-500 font-medium">
              Última atualização selecionada por padrão
            </span>
          </div>
        </div>

        {/* SELECT / LISTBOX DE DATAS E VERSÕES */}
        <select
          value={selectedVersion}
          onChange={(e) => setSelectedVersion(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[280px]"
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
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                  {activeRelease.version}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  Lançado em {activeRelease.date}
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 mt-2">
                {activeRelease.title}
              </h2>
            </div>

            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Versão Estável em Produção
            </span>
          </div>

          {/* Destaques da Release em Formatagem Limpa */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Principais Melhorias & Implementações desta Versão:
            </h3>

            <div className="bg-slate-50/80 rounded-2xl border border-slate-200/60 p-5 space-y-3 text-xs text-slate-800 font-medium leading-relaxed">
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 space-y-2">
                {activeRelease.rawContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
