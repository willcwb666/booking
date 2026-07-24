import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import React from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";

// ─── Configuração Dinâmica por Nicho ──────────────────────────────────────────
const THEMES = {
  HOME_CLEANING: {
    bg: "bg-[#F0F7FA]",
    textMain: "text-sky-950",
    textSub: "text-sky-700",
    buttonBg: "bg-sky-600 hover:bg-sky-700 shadow-sky-600/30",
    buttonText: "text-white",
    cardBg: "bg-white border-sky-100",
    cardHover: "hover:border-sky-300 hover:shadow-sky-100",
    icon: "✨",
  },
  BARBER: {
    bg: "bg-[#0A0A0A]",
    textMain: "text-white",
    textSub: "text-zinc-400",
    buttonBg: "bg-red-600 hover:bg-red-700 shadow-red-900/40",
    buttonText: "text-white",
    cardBg: "bg-zinc-900 border-zinc-800",
    cardHover: "hover:border-red-900/50 hover:shadow-red-900/20",
    icon: "💈",
  },
  LAWN_CARE: {
    bg: "bg-[#F0FAF4]",
    textMain: "text-emerald-950",
    textSub: "text-emerald-700",
    buttonBg: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30",
    buttonText: "text-white",
    cardBg: "bg-white border-emerald-100",
    cardHover: "hover:border-emerald-300 hover:shadow-emerald-100",
    icon: "🌱",
  },
  CAR_WASH: {
    bg: "bg-blue-50",
    textMain: "text-blue-950",
    textSub: "text-blue-700",
    buttonBg: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30",
    buttonText: "text-white",
    cardBg: "bg-white border-blue-100",
    cardHover: "hover:border-blue-300 hover:shadow-blue-100",
    icon: "🚗",
  },
  DEFAULT: {
    bg: "bg-stone-50",
    textMain: "text-stone-900",
    textSub: "text-stone-500",
    buttonBg: "bg-stone-900 hover:bg-stone-800 shadow-stone-900/20",
    buttonText: "text-white",
    cardBg: "bg-white border-stone-200",
    cardHover: "hover:border-stone-400 hover:shadow-stone-200",
    icon: "📌",
  }
};

export default async function TenantLandingPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug: slug } = await params;
  
  // 1. Busca a Empresa no banco pelo Slug
  const company = await db.company.findUnique({
    where: { slug, isActive: true },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { order: 'asc' },
        include: {
          serviceTypes: {
            where: { isActive: true },
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });

  // Se o slug não existir, mostra a página 404
  if (!company) {
    notFound();
  }

  // 2. Define as cores/tema com base no "businessType"
  const theme = THEMES[company.businessType as keyof typeof THEMES] || THEMES.DEFAULT;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${theme.bg} ${theme.textMain}`}>
      
      {/* ── Cabeçalho do Cliente ── */}
      <header className="w-full pt-12 pb-6 px-6 md:px-0">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="w-24 h-24 rounded-full mb-6 border-4 border-white shadow-lg object-cover" />
          ) : (
            <div className={`w-24 h-24 rounded-full mb-6 flex items-center justify-center text-4xl shadow-lg border-4 ${theme.cardBg}`}>
              {theme.icon}
            </div>
          )}
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            {company.name}
          </h1>
          
          {company.address && (
            <p className={`text-lg font-medium max-w-lg mb-8 ${theme.textSub}`}>
              📍 {company.address}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-4">
            <Link href={`/book/${company.slug}`} className={`px-8 py-4 rounded-full text-lg font-bold transition-all hover:scale-105 shadow-xl ${theme.buttonBg} ${theme.buttonText}`}>
              Agendar Horário
            </Link>
            {company.phone && (
              <a href={`https://wa.me/${company.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className={`px-8 py-4 rounded-full text-lg font-bold border transition-all hover:scale-105 ${theme.cardBg} ${theme.textMain}`}>
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Lista de Serviços Dinâmica ── */}
      <main className="max-w-3xl mx-auto px-6 md:px-0 py-12">
        <h2 className="text-2xl font-bold mb-8 text-center uppercase tracking-widest text-sm opacity-80">Nossos Serviços</h2>

        {company.services.length === 0 ? (
          <div className={`p-8 rounded-3xl text-center border ${theme.cardBg} ${theme.textSub}`}>
            Nenhum serviço cadastrado no momento.
          </div>
        ) : (
          <div className="space-y-8">
            {company.services.map((service) => (
              <div key={service.id} className="space-y-4">
                <h3 className="text-xl font-bold border-b pb-2 opacity-90">{service.name}</h3>
                {service.description && (
                  <p className={`text-sm mb-4 ${theme.textSub}`}>{service.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.serviceTypes.map((type) => (
                    <div 
                      key={type.id} 
                      className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${theme.cardBg} ${theme.cardHover}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-lg">{type.name}</h4>
                        <span className="font-extrabold">{formatMoney(Number(type.price), company.currency, company.locale)}</span>
                      </div>
                      {type.description && (
                        <p className={`text-sm mb-4 ${theme.textSub}`}>{type.description}</p>
                      )}
                      <div className="flex justify-between items-center mt-4">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-black/5 dark:bg-white/10`}>
                          ⏱ {type.estimatedMinutes} min
                        </span>
                        <Link href={`/book/${company.slug}`} className={`text-sm font-bold px-4 py-2 rounded-lg transition-all ${theme.buttonBg} ${theme.buttonText}`}>
                          Selecionar
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* ── Footer Branding ── */}
      <footer className="w-full py-10 mt-12 text-center opacity-50">
        <p className={`text-sm font-medium ${theme.textSub}`}>
          Agendamento inteligente powered by <span className="font-bold">agendei.</span>
        </p>
      </footer>

    </div>
  );
}
