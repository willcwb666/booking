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
    accentColor: "#635bff",
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Customização da Landing Page Pública</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Personalize o visual e os serviços em destaque que os clientes verão no seu link de agendamento.
              </p>
            </div>
          </div>

          <a
            href={`/booking/${companySlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ver Sua Landing Page ↗</span>
          </a>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Título de Cabeçalho (Hero Title)</label>
              <input
                type="text"
                value={config.heroTitle}
                onChange={(e) => setConfig({ ...config, heroTitle: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Seja bem-vindo à nossa barbearia"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cor Principal de Destaque</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={config.accentColor}
                  onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                  className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={config.accentColor}
                  onChange={(e) => setConfig({ ...config, accentColor: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Subtítulo / Mensagem de Apresentação</label>
            <textarea
              rows={2}
              value={config.heroSubtitle}
              onChange={(e) => setConfig({ ...config, heroSubtitle: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Reserve os melhores horários com nossos profissionais qualificados."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">URL da Imagem de Banner da Capa (Opcional)</label>
            <input
              type="text"
              value={config.bannerUrl}
              onChange={(e) => setConfig({ ...config, bannerUrl: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              placeholder="https://exemplo.com/imagem-estabelecimento.jpg"
            />
          </div>

          {/* Seleção de Serviços em Destaque (Máximo 6) */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800">
                Selecione os Serviços em Destaque na Capa (Até 6):
              </span>
              <span className="text-[11px] font-bold text-indigo-600">
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
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{s.name}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="pt-4 flex justify-end border-t border-slate-100">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="px-6 py-2.5 bg-[#635bff] hover:bg-[#544dc9] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
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
