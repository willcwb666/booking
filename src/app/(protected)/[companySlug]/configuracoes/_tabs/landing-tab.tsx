"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getCompanyLandingPageConfigAction,
  updateCompanyLandingPageConfigAction,
  type CompanyLandingPageConfig,
} from "@/server/actions/landing-page-settings";
import { toast } from "@/lib/toast-service";
import { Palette, Globe, CheckCircle2, Star, Tag } from "@/components/ui/icons";

type Props = {
  companySlug: string;
  canEdit: boolean;
  availableServices: Array<{ id: string; name: string }>;
};

export function LandingTab({ companySlug, canEdit, availableServices }: Props) {
  const [config, setConfig] = useState<CompanyLandingPageConfig>({
    heroTitle: "Bem-vindo!",
    heroSubtitle: "Agende seus serviços com facilidade e praticidade.",
    bannerUrl: "",
    accentColor: "var(--color-primary)",
    featuredServiceIds: [],
    showTestimonials: true,
    customWelcomeMessage: "",
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const res = await getCompanyLandingPageConfigAction(companySlug);
      if (res.success) {
        setConfig(res.config);
      }
    }
    load();
  }, [companySlug]);

  function handleToggleService(serviceId: string) {
    const current = config.featuredServiceIds || [];
    if (current.includes(serviceId)) {
      setConfig({
        ...config,
        featuredServiceIds: current.filter((id) => id !== serviceId),
      });
    } else {
      if (current.length >= 6) {
        toast.warning("Limite de Serviços", "Você pode destacar no máximo 6 serviços na capa.");
        return;
      }
      setConfig({
        ...config,
        featuredServiceIds: [...current, serviceId],
      });
    }
  }

  function handleSave() {
    startTransition(async () => {
      const res = await updateCompanyLandingPageConfigAction(companySlug, config);
      if (res.success) {
        toast.success("Landing Page Atualizada", res.message);
      } else {
        toast.error("Erro", res.error || "Falha ao salvar configurações.");
      }
    });
  }

  return (
    <div className="space-y-6 text-left">
      <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[var(--radius-card)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-heading)]">Customização da Landing Page Pública</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Personalize o visual e os serviços em destaque que os clientes verão no seu link de agendamento.
              </p>
            </div>
          </div>

          <a
            href={`/booking/${companySlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text-heading)] font-bold text-xs rounded-[var(--radius-control)] transition-all inline-flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Ver Sua Landing Page ↗</span>
          </a>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-heading)] mb-1">Título de Cabeçalho (Hero Title)</label>
              <input
                type="text"
                value={config.heroTitle}
                onChange={(e) => setConfig({ ...config, heroTitle: e.target.value })}
                className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs font-bold text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="Ex: Seja bem-vindo à nossa barbearia"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-heading)] mb-1">Cor Principal da Marca</label>
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                    className="w-10 h-10 rounded-[var(--radius-control)] border border-[var(--color-border)] cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={config.accentColor}
                    onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                    className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs font-mono text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                {/* Paletas de Cor Rápidas com 1 Clique */}
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] font-bold mr-1">Sugestões:</span>
                  {[
                    { label: "💈 Azul Royal", color: "#2563eb" },
                    { label: "💅 Rosa Beauty", color: "#db2777" },
                    { label: "🌿 Verde Esmeralda", color: "#059669" },
                    { label: "👑 Dourado Gold", color: "#d97706" },
                    { label: "💜 Roxo Velvet", color: "#7c3aed" },
                    { label: "🖤 Dark Minimalista", color: "#0f172a" },
                  ].map((p) => (
                    <button
                      key={p.color}
                      type="button"
                      onClick={() => setConfig({ ...config, accentColor: p.color })}
                      className="px-2 py-1 rounded-[var(--radius-control)] border border-[var(--color-border)] text-[var(--text-2xs)] font-bold transition-all hover:scale-105 flex items-center gap-1 cursor-pointer bg-[var(--color-bg)]"
                    >
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-heading)] mb-1">Subtítulo / Mensagem de Apresentação</label>
            <textarea
              rows={2}
              value={config.heroSubtitle}
              onChange={(e) => setConfig({ ...config, heroSubtitle: e.target.value })}
              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] p-3 text-xs font-medium text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="Ex: Reserve os melhores horários com nossos profissionais qualificados."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-heading)] mb-1">URL da Imagem de Banner da Capa (Opcional)</label>
            <input
              type="text"
              value={config.bannerUrl}
              onChange={(e) => setConfig({ ...config, bannerUrl: e.target.value })}
              className="w-full border border-[var(--color-border)] rounded-[var(--radius-control)] px-3.5 py-2.5 text-xs text-[var(--color-text-heading)] focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="https://exemplo.com/imagem-estabelecimento.jpg"
            />
          </div>

          {/* Prévia ao Vivo da Bio do Estabelecimento */}
          <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] space-y-2">
            <span className="text-[var(--text-2xs)] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] block">
              👁️ Prévia ao Vivo do seu Card Público:
            </span>
            <div className="p-4 rounded-[var(--radius-card)] bg-[var(--color-bg)] border border-[var(--color-border)] shadow-xs flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-[var(--radius-control)] flex items-center justify-center text-white font-semibold text-lg shrink-0 shadow-xs"
                style={{ backgroundColor: config.accentColor || "#2563eb" }}
              >
                {companySlug[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-[var(--color-text-heading)] truncate">
                  {config.heroTitle || "Nome do Estabelecimento"}
                </h4>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  {config.heroSubtitle || "Atendimento profissional com agendamento online rápido."}
                </p>
              </div>
              <span
                className="px-3 py-1.5 rounded-[var(--radius-control)] text-white font-semibold text-xs shrink-0 shadow-xs hidden sm:inline-block"
                style={{ backgroundColor: config.accentColor || "#2563eb" }}
              >
                Agendar Horário
              </span>
            </div>
          </div>

          {/* Seleção de Serviços em Destaque (Máximo 6) */}
          <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-heading)]">
                Selecione os Serviços em Destaque na Capa (Até 6):
              </span>
              <span className="text-[var(--text-2xs)] font-bold text-[var(--color-primary)]">
                {config.featuredServiceIds.length} de 6 Selecionados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {availableServices.map((s) => {
                const isSelected = config.featuredServiceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleToggleService(s.id)}
                    className={`p-3 rounded-[var(--radius-card)] border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary)] shadow-2xs"
                        : "bg-[var(--color-bg-subtle)] border-[var(--color-border)] text-[var(--color-text-heading)] hover:bg-[var(--color-bg-muted)]"
                    }`}
                  >
                    <span>{s.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="pt-4 flex justify-end border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold text-xs rounded-[var(--radius-control)] shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isPending ? "Salvando..." : "Salvar Landing Page Customizada"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
