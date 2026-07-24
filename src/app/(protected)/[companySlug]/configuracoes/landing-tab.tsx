"use client";

import React from "react";

type Props = {
  companySlug: string;
  canEdit: boolean;
  availableServices?: Array<{ id: string; name: string }>;
  initial?: {
    heroTitle: string;
    heroSubtitle: string;
    brandColor: string;
    coverImageUrl: string;
    socialInstagram: string;
    socialWhatsapp: string;
    socialFacebook: string;
  };
  onChange?: (field: string, value: string) => void;
};

export function LandingTab({ canEdit, initial, onChange }: Props) {
  const handleChange = (field: string, value: string) => {
    if (onChange) {
      onChange(field, value);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-stone-900">Customização da Landing Page Pública</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Personalize a aparência do seu link público de agendamentos compartilhado com seus clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="heroTitle" className="block text-xs font-bold text-stone-700 mb-1">
              Título Principal (Hero Headline)
            </label>
            <input
              id="heroTitle"
              value={initial?.heroTitle ?? ""}
              onChange={(e) => handleChange("heroTitle", e.target.value)}
              disabled={!canEdit}
              placeholder="Ex: Sua beleza e bem-estar em primeiro lugar"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
            />
          </div>

          <div>
            <label htmlFor="heroSubtitle" className="block text-xs font-bold text-stone-700 mb-1">
              Subtítulo Explicativo
            </label>
            <input
              id="heroSubtitle"
              value={initial?.heroSubtitle ?? ""}
              onChange={(e) => handleChange("heroSubtitle", e.target.value)}
              disabled={!canEdit}
              placeholder="Ex: Agende seus serviços online em 1 minuto com atendimento VIP"
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="brandColor" className="block text-xs font-bold text-stone-700 mb-1">
                Cor Primária da Marca
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="brandColor"
                  type="color"
                  value={initial?.brandColor || "#0f172a"}
                  onChange={(e) => handleChange("brandColor", e.target.value)}
                  disabled={!canEdit}
                  className="w-12 h-10 rounded-lg border border-stone-200 cursor-pointer disabled:opacity-50"
                />
                <input
                  type="text"
                  value={initial?.brandColor || "#0f172a"}
                  onChange={(e) => handleChange("brandColor", e.target.value)}
                  disabled={!canEdit}
                  className="flex-1 border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="coverImageUrl" className="block text-xs font-bold text-stone-700 mb-1">
                URL da Foto de Capa / Banner
              </label>
              <input
                id="coverImageUrl"
                value={initial?.coverImageUrl ?? ""}
                onChange={(e) => handleChange("coverImageUrl", e.target.value)}
                disabled={!canEdit}
                placeholder="https://exemplo.com/sua-fachada.jpg"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
              />
            </div>
          </div>
        </div>

        {/* Redes Sociais */}
        <div className="pt-4 border-t border-stone-100 space-y-4">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Redes Sociais & Contato</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="socialInstagram" className="block text-xs text-stone-600 mb-1">
                Instagram (@usuario)
              </label>
              <input
                id="socialInstagram"
                value={initial?.socialInstagram ?? ""}
                onChange={(e) => handleChange("socialInstagram", e.target.value)}
                disabled={!canEdit}
                placeholder="@suaempresa"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
              />
            </div>
            <div>
              <label htmlFor="socialWhatsapp" className="block text-xs text-stone-600 mb-1">
                WhatsApp de Atendimento
              </label>
              <input
                id="socialWhatsapp"
                value={initial?.socialWhatsapp ?? ""}
                onChange={(e) => handleChange("socialWhatsapp", e.target.value)}
                disabled={!canEdit}
                placeholder="5541999999999"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
              />
            </div>
            <div>
              <label htmlFor="socialFacebook" className="block text-xs text-stone-600 mb-1">
                Facebook
              </label>
              <input
                id="socialFacebook"
                value={initial?.socialFacebook ?? ""}
                onChange={(e) => handleChange("socialFacebook", e.target.value)}
                disabled={!canEdit}
                placeholder="facebook.com/suaempresa"
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-stone-50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
