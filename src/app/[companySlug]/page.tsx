import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import React from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";

export default async function TenantLandingPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug: slug } = await params;
  
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

  if (!company) {
    notFound();
  }

  const brandColor = company.brandColor || "#0f172a";
  const heroTitle = company.heroTitle || `Bem-vindo à ${company.name}`;
  const heroSubtitle = company.heroSubtitle || "Agende seus serviços online em 1 minuto com atendimento VIP 24/7";
  const whatsappNum = company.socialWhatsapp || company.phone || "";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans text-left transition-colors duration-500">
      
      {/* ── Top Navbar Pública ── */}
      <nav className="w-full bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="w-10 h-10 rounded-full object-cover border border-stone-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center font-black text-sm">
                {company.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="font-extrabold text-stone-900 text-lg tracking-tight">{company.name}</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {whatsappNum && (
              <a
                href={`https://wa.me/${whatsappNum.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all"
              >
                📱 WhatsApp
              </a>
            )}
            <Link
              href={`/book/${company.slug}`}
              className="px-5 py-2.5 text-white font-bold rounded-xl text-xs shadow-md transition-all hover:opacity-90"
              style={{ backgroundColor: brandColor }}
            >
              Agendar Horário
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Banner ── */}
      <section className="relative w-full py-16 sm:py-24 px-6 border-b border-stone-200 overflow-hidden bg-white">
        {company.coverImageUrl && (
          <div
            className="absolute inset-0 opacity-15 bg-cover bg-center"
            style={{ backgroundImage: `url(${company.coverImageUrl})` }}
          />
        )}

        <div className="max-w-4xl mx-auto text-left relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-full text-[11px] font-bold text-stone-700 uppercase tracking-wider">
            ✨ Agendamento Online Garantido
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight leading-tight">
            {heroTitle}
          </h1>

          <p className="text-base sm:text-lg text-stone-600 max-w-2xl leading-relaxed">
            {heroSubtitle}
          </p>

          {company.address && (
            <p className="text-xs sm:text-sm font-semibold text-stone-500 flex items-center gap-1.5">
              📍 {company.address}
            </p>
          )}

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href={`/book/${company.slug}`}
              className="px-8 py-4 text-white font-black text-sm rounded-2xl shadow-xl transition-all hover:scale-105"
              style={{ backgroundColor: brandColor }}
            >
              Ver Horários e Agendar ➔
            </Link>
          </div>
        </div>
      </section>

      {/* ── Catálogo de Serviços ── */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-stone-400">Catálogo de Atendimentos</h2>
          <h3 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">Serviços Disponíveis</h3>
        </div>

        {company.services.length === 0 ? (
          <div className="p-8 rounded-3xl text-center bg-white border border-stone-200 text-stone-500 text-xs">
            Nenhum serviço cadastrado no momento.
          </div>
        ) : (
          <div className="space-y-8">
            {company.services.map((service) => (
              <div key={service.id} className="space-y-4">
                <h4 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-2">{service.name}</h4>
                {service.description && (
                  <p className="text-xs text-stone-500 mb-4">{service.description}</p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.serviceTypes.map((type) => (
                    <div 
                      key={type.id} 
                      className="p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-400 hover:shadow-md transition-all duration-300 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-stone-900 text-base">{type.name}</h5>
                        <span className="font-black text-stone-900">
                          {formatMoney(Number(type.price), company.currency, company.locale)}
                        </span>
                      </div>
                      {type.description && (
                        <p className="text-xs text-stone-500">{type.description}</p>
                      )}
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
                          ⏱ {type.estimatedMinutes} min
                        </span>
                        <Link
                          href={`/book/${company.slug}`}
                          className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: brandColor }}
                        >
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
      
      {/* ── Footer ── */}
      <footer className="w-full py-12 border-t border-stone-200 bg-white text-center text-xs text-stone-500 space-y-3">
        <p>
          © {new Date().getFullYear()} {company.name} · Sistema de Agendamento Inteligente
        </p>
        <p>
          <Link href="/login" className="text-stone-400 hover:text-stone-700 underline font-medium">
            Área da Equipe / Entrar no Sistema
          </Link>
        </p>
      </footer>

    </div>
  );
}
