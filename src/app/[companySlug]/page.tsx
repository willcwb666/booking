import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { formatMoney } from "@/lib/format";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LocalBusinessJsonLd } from "@/components/seo/json-ld";
import { CustomLinkShare } from "@/components/ui/custom-link-share";
import { CompanyMapRoutes } from "@/components/ui/company-map-routes";
import { getRequestOrigin } from "@/lib/site-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}): Promise<Metadata> {
  const { companySlug: slug } = await params;
  const company = await db.company.findUnique({
    where: { slug, isActive: true },
    select: { name: true, heroSubtitle: true, logoUrl: true, address: true },
  });

  if (!company) {
    return {
      title: "Empresa não encontrada",
      description: "A empresa solicitada não foi encontrada.",
    };
  }

  const title = `${company.name} — Agendamento Online & Catálogo`;
  const description =
    company.heroSubtitle ||
    `Agende serviços online com ${company.name}. Atendimento profissional, confirmação instantânea e orçamentos via WhatsApp.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: company.logoUrl ? [{ url: company.logoUrl, alt: company.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function TenantLandingPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug: slug } = await params;
  const origin = await getRequestOrigin();

  const company = await db.company.findUnique({
    where: { slug, isActive: true },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: {
          serviceTypes: {
            where: { isActive: true },
            orderBy: { order: "asc" },
          },
        },
      },
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) {
    notFound();
  }

  const brandColor = company.brandColor || "#10b981";
  const heroTitle = company.heroTitle || `Bem-vindo à ${company.name}`;
  const heroSubtitle =
    company.heroSubtitle ||
    "Agende seus serviços online em 1 minuto com atendimento VIP e confirmação imediata 24/7";
  const whatsappNum = company.socialWhatsapp || company.phone || "";

  // Aggregate reviews rating
  const reviewCount = company.reviews.length;
  const avgRating =
    reviewCount > 0
      ? company.reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount
      : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] text-[var(--color-text-heading)] font-sans text-left selection:bg-[var(--color-navy)] selection:text-white antialiased">
      {/* Schema.org LocalBusiness */}
      <LocalBusinessJsonLd
        name={company.name}
        description={heroSubtitle}
        url={`https://kreator.com.br/${company.slug}`}
        logo={company.logoUrl}
        telephone={company.phone}
        address={company.address}
        ratingValue={avgRating}
        reviewCount={reviewCount}
        businessType="LocalBusiness"
      />

      {/* ── Top Navbar Pública (Glassmorphic) ── */}
      <nav className="w-full bg-[var(--color-bg)] backdrop-blur-xl border-b border-[var(--color-border)] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={`Logo da empresa ${company.name}`}
                className="w-10 h-10 rounded-[var(--radius-card)] object-cover border border-[var(--color-border)] shadow-2xs"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-[var(--radius-card)] text-white flex items-center justify-center font-serif font-semibold text-base shadow-2xs"
                style={{ backgroundColor: brandColor }}
              >
                {company.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-semibold text-[var(--color-text-heading)] text-base sm:text-lg tracking-tight block leading-tight">
                {company.name}
              </span>
              <span className="text-[var(--text-2xs)] text-[var(--color-success)] font-bold flex items-center gap-1">
                ● Atendimento Online 24/7
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {whatsappNum && (
              <a
                href={`https://wa.me/${whatsappNum.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="btn-tactile hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success-border)] hover:bg-[var(--color-success-light)] rounded-full text-xs font-bold shadow-2xs"
              >
                📱 WhatsApp
              </a>
            )}
            <Link
              href={`/book/${company.slug}`}
              className="btn-tactile px-5 py-2.5 text-white font-semibold rounded-full text-xs shadow-xs"
              style={{ backgroundColor: brandColor }}
            >
              Agendar Horário
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Breadcrumbs ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
        <Breadcrumbs
          items={[
            { name: "Início", url: "/" },
            { name: "Empresas", url: "/empresas" },
            { name: company.name, url: `/${company.slug}` },
          ]}
        />
      </div>

      {/* ── Hero Banner ── */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 mt-4">
        <div className="rounded-[var(--radius-panel)] bg-[var(--color-bg)] border border-[var(--color-border)] p-8 sm:p-12 relative overflow-hidden card-tactile shadow-xs">
          {company.coverImageUrl && (
            <div
              className="absolute inset-0 opacity-10 bg-cover bg-center"
              style={{ backgroundImage: `url(${company.coverImageUrl})` }}
            />
          )}

          <div className="relative z-10 space-y-5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[var(--color-bg-muted)] rounded-full text-[var(--text-2xs)] font-bold text-[var(--color-text)] uppercase tracking-wider border border-[var(--color-border)]">
              <span>✨ Confirmação Instantânea em 1 Minuto</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-semibold text-[var(--color-text-heading)] tracking-tight leading-tight">
              {heroTitle}
            </h1>

            <p className="text-base sm:text-lg text-[var(--color-text-muted)] leading-relaxed font-medium">
              {heroSubtitle}
            </p>

            {/* SLA & Fast response badges */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-[var(--color-success)] bg-[var(--color-success-light)] px-3 py-1.5 rounded-full border border-[var(--color-success-border)] font-bold">
                ⚡ Confirmação Imediata
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--color-info)] bg-[var(--color-info-light)] px-3 py-1.5 rounded-full border border-[var(--color-info-border)] font-bold">
                📱 Lembrete no WhatsApp
              </span>
              {avgRating && (
                <span className="inline-flex items-center gap-1.5 text-[var(--color-warning)] bg-[var(--color-warning-light)] px-3 py-1.5 rounded-full border border-[var(--color-warning-border)] font-bold">
                  ★ {avgRating.toFixed(1)} ({reviewCount} avaliações)
                </span>
              )}
            </div>

            <div className="pt-3">
              <Link
                href={`/book/${company.slug}`}
                className="btn-tactile px-8 py-4 text-white font-semibold text-sm rounded-[var(--radius-card)] shadow-md inline-flex items-center gap-2"
                style={{ backgroundColor: brandColor }}
              >
                <span>Ver Horários e Agendar Online</span>
                <span>➔</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        
        {/* Custom Link Sharing Widget */}
        <CustomLinkShare
          slug={company.slug}
          companyName={company.name}
          brandColor={brandColor}
          origin={origin}
        />

        {/* ── Catálogo de Serviços ── */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-success)]">
              Catálogo de Atendimentos
            </h2>
            <h3 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-heading)] mt-1">Serviços Disponíveis</h3>
          </div>

          {company.services.length === 0 ? (
            <div className="p-12 rounded-[var(--radius-panel)] text-center bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm card-tactile shadow-xs">
              Nenhum serviço cadastrado no momento.
            </div>
          ) : (
            <div className="space-y-8">
              {company.services.map((service) => (
                <div key={service.id} className="space-y-4">
                  <h4 className="text-lg font-semibold text-[var(--color-text-heading)] border-b border-[var(--color-border)] pb-2">
                    {service.name}
                  </h4>
                  {service.description && (
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-4">{service.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {service.serviceTypes.map((type) => (
                      <div
                        key={type.id}
                        className="card-tactile p-6 rounded-[var(--radius-panel)] bg-[var(--color-bg)] border border-[var(--color-border)] space-y-4 flex flex-col justify-between shadow-xs hover:border-[var(--color-border-strong)] transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="font-bold text-[var(--color-text-heading)] text-base">{type.name}</h5>
                            <span className="font-semibold text-[var(--color-text-heading)] text-lg">
                              {formatMoney(Number(type.price), company.currency, company.locale)}
                            </span>
                          </div>
                          {type.description && (
                            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{type.description}</p>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-[var(--color-border)]">
                          <span className="text-[var(--text-2xs)] font-bold px-3 py-1 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text)] border border-[var(--color-border)]">
                            ⏱ {type.estimatedMinutes} min
                          </span>
                          <Link
                            href={`/book/${company.slug}`}
                            className="btn-tactile text-xs font-bold px-4 py-2 rounded-[var(--radius-control)] text-white shadow-2xs"
                            style={{ backgroundColor: brandColor }}
                          >
                            Selecionar Horário
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Avaliações Reais dos Clientes ── */}
        {company.reviews.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-[var(--color-border)]">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-warning)] bg-[var(--color-warning-light)] px-3.5 py-1 rounded-full border border-[var(--color-warning-border)]">
                ★ Avaliações Reais
              </span>
              <h3 className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-heading)] mt-2">
                O que dizem os clientes de {company.name}
              </h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {company.reviews.map((review) => (
                <div
                  key={review.id}
                  className="card-tactile p-6 rounded-[var(--radius-panel)] bg-[var(--color-bg)] border border-[var(--color-border)] space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[var(--color-warning)]">
                      {[...Array(review.rating)].map((_, i) => (
                        <span key={i} className="text-base">★</span>
                      ))}
                    </div>
                    <span className="text-[var(--text-2xs)] text-[var(--color-text-subtle)] font-mono">
                      {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-xs sm:text-sm text-[var(--color-text)] leading-relaxed font-medium italic">
                      &ldquo;{review.comment}&rdquo;
                    </p>
                  )}
                  <p className="text-xs font-bold text-[var(--color-text-heading)] pt-1">
                    👤 {review.reviewerName || "Cliente Satisfeito"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Mapas e Rotas ── */}
        {company.address && (
          <section className="pt-6 border-t border-[var(--color-border)]">
            <CompanyMapRoutes
              address={company.address}
              companyName={company.name}
              brandColor={brandColor}
            />
          </section>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-12 border-t border-[var(--color-border)] bg-[var(--color-bg-muted)] text-center text-xs text-[var(--color-text-muted)] space-y-3 mt-12">
        <p>© {new Date().getFullYear()} {company.name} · Plataforma Kreator</p>
        <div className="flex justify-center gap-4 text-[var(--color-text-muted)] font-semibold">
          <Link href="/privacidade" className="hover:text-[var(--color-text-heading)] underline">
            Privacidade
          </Link>
          <Link href="/termos" className="hover:text-[var(--color-text-heading)] underline">
            Termos
          </Link>
          <Link href="/login" className="hover:text-[var(--color-text-heading)] underline">
            Área da Empresa
          </Link>
        </div>
      </footer>
    </div>
  );
}
