import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import React from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Instagram,
  CheckCircle2,
  Star,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LocalBusinessJsonLd } from "@/components/seo/json-ld";
import { AIBookingCopilot } from "@/components/ui/ai-booking-copilot";
import { GhostSlotBanner } from "@/components/ui/ghost-slot-banner";
import { VIPExperienceSelector } from "@/components/ui/vip-experience-selector";
import { getActiveGhostSlotsAction } from "@/server/actions/ghost-slot-buster";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const company = await db.company.findUnique({
    where: { slug: companySlug, isActive: true },
    select: { name: true, heroSubtitle: true, logoUrl: true, coverImageUrl: true },
  });

  if (!company) {
    return {
      title: "Empresa não encontrada",
      description: "A empresa solicitada não foi encontrada.",
    };
  }

  return {
    title: `Agendar Atendimento — ${company.name}`,
    description:
      company.heroSubtitle ||
      `Agende seus serviços online com ${company.name}. Escolha o melhor horário e receba confirmação instantânea.`,
    openGraph: {
      title: `Agendar com ${company.name}`,
      description:
        company.heroSubtitle ||
        `Agende serviços online com confirmação imediata.`,
      images: company.logoUrl ? [{ url: company.logoUrl, alt: company.name }] : [],
    },
  };
}

export default async function BookingCompanyPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  const company = await db.company.findUnique({
    where: { slug: companySlug, isActive: true },
    include: {
      bookingConfigs: {
        where: { status: "PUBLISHED" },
        include: {
          serviceTypes: {
            include: {
              serviceType: true,
            },
          },
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  // Get aggregated reviews for this company
  const reviews = await db.review.findMany({
    where: { companyId: company.id },
    select: { rating: true },
  });

  const reviewStats = {
    count: reviews.length,
    average:
      reviews.length > 0
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
        : null,
  };

  const ghostSlots = await getActiveGhostSlotsAction(companySlug);

  const whatsappPhone = company.socialWhatsapp || company.phone || "";
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Gostaria de agendar um atendimento na ${company.name}.`
      )}`
    : null;

  const primaryBookingHref =
    company.bookingConfigs.length === 1
      ? `/book/${companySlug}/${company.bookingConfigs[0].id}`
      : null;

  const brandColor = company.brandColor || "#10b981";

  return (
    <div
      className="min-h-screen bg-[#FAFAFA] text-[var(--color-text-heading)] pb-24 selection:bg-[var(--color-navy)] selection:text-white font-sans antialiased"
      style={{ "--tenant-brand": brandColor } as React.CSSProperties}
    >
      <LocalBusinessJsonLd
        name={company.name}
        description={company.heroSubtitle || undefined}
        url={`https://kreator.com.br/book/${company.slug}`}
        logo={company.logoUrl}
        telephone={company.phone}
        address={company.address}
        ratingValue={reviewStats.average}
        reviewCount={reviewStats.count}
      />

      {/* Banner / Cover */}
      <div className="relative h-44 sm:h-56 bg-[var(--color-navy)] overflow-hidden" style={{ backgroundColor: brandColor }}>
        {company.coverImageUrl && (
          <img
            src={company.coverImageUrl}
            alt={`Foto de capa de ${company.name}`}
            className="w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)] via-transparent to-transparent" />
      </div>

      {/* Main Profile Card Container */}
      <main className="max-w-2xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-10 space-y-6">
        <Breadcrumbs
          className="bg-[var(--color-bg)] backdrop-blur-xl px-4 py-2 rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-xs"
          items={[
            { name: "Início", url: "/" },
            { name: "Empresas", url: "/empresas" },
            { name: company.name, url: `/${company.slug}` },
            { name: "Agendar", url: `/book/${company.slug}` },
          ]}
        />

        {/* Profile Card */}
        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] p-6 sm:p-8 border border-[var(--color-border)] shadow-xs text-center sm:text-left card-tactile">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Logo Avatar */}
            <div
              className="w-24 h-24 rounded-[var(--radius-card)] border-4 border-white shadow-md flex items-center justify-center shrink-0 overflow-hidden text-white"
              style={{ backgroundColor: brandColor }}
            >
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-3xl font-semibold font-serif">
                  {company.name[0]?.toUpperCase()}
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-[var(--color-text-heading)]">
                  {company.name}
                </h1>
                <span
                  title="Empresa Verificada"
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold gap-1 bg-[var(--color-success-light)] text-[var(--color-success)] border border-[var(--color-success-border)]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verificado</span>
                </span>
              </div>

              {/* Tagline / Subtitle */}
              <p className="text-xs text-[var(--color-text-muted)] max-w-md">
                {company.heroSubtitle || "Atendimento profissional com agendamento online rápido e seguro."}
              </p>

              {/* Rating & Details */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-[var(--color-text-muted)]">
                {reviewStats.count > 0 && reviewStats.average !== null ? (
                  <div className="flex items-center gap-1 font-bold text-[var(--color-warning)] bg-[var(--color-warning-light)] px-2.5 py-1 rounded-[var(--radius-control)] border border-[var(--color-warning-border)]">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{reviewStats.average.toFixed(1)}</span>
                    <span className="text-[var(--color-text-muted)] font-normal">({reviewStats.count})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[var(--color-text-muted)] bg-[var(--color-bg-muted)] px-2.5 py-1 rounded-[var(--radius-control)] border border-[var(--color-border)]">
                    <Star className="w-3.5 h-3.5" />
                    <span>Novo</span>
                  </div>
                )}

                {company.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-text-subtle)]" />
                    <span className="truncate max-w-[200px]">{company.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Social & Contact Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-6 mt-6 border-t border-[var(--color-border)]">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile flex items-center justify-center gap-2 py-2.5 px-3 rounded-[var(--radius-control)] bg-[var(--color-success-light)] hover:bg-[var(--color-success-light)] border border-[var(--color-success-border)] text-[var(--color-success)] text-xs font-bold transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {company.socialInstagram && (
              <a
                href={`https://instagram.com/${company.socialInstagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile flex items-center justify-center gap-2 py-2.5 px-3 rounded-[var(--radius-control)] bg-[var(--color-danger-light)] hover:bg-[var(--color-danger-light)] border border-[var(--color-danger-border)] text-[var(--color-danger)] text-xs font-bold transition-colors"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>Instagram</span>
              </a>
            )}

            {company.phone && (
              <a
                href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="btn-tactile flex items-center justify-center gap-2 py-2.5 px-3 rounded-[var(--radius-control)] bg-[var(--color-bg-muted)] hover:bg-[var(--color-bg-muted)] border border-[var(--color-border)] text-[var(--color-text)] text-xs font-bold transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Ligar</span>
              </a>
            )}
          </div>
        </div>

        {/* ── 1. Ofertas Relâmpago de Última Hora (Ghost Slot Buster) ── */}
        <GhostSlotBanner
          offers={ghostSlots.data}
          companySlug={companySlug}
          configId={company.bookingConfigs[0]?.id}
        />

        {/* ── 2. Copilot de Agendamento por IA Ativa (Texto e Voz) ── */}
        <AIBookingCopilot companySlug={companySlug} />

        {/* ── 3. Personalização de Experiência VIP ── */}
        <VIPExperienceSelector />

        {/* Catalog of Services / Booking Options */}
        <section aria-labelledby="services-heading" className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 id="services-heading" className="text-xs font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              Serviços & Agendamento Online
            </h2>
            <span className="text-xs text-[var(--color-text-muted)] font-medium">
              Disponibilidade 24/7
            </span>
          </div>

          {company.bookingConfigs.length === 0 ? (
            <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-10 text-center space-y-2 shadow-xs">
              <Calendar className="w-8 h-8 text-[var(--color-text-subtle)] mx-auto" />
              <p className="text-sm font-bold text-[var(--color-text)]">Nenhum serviço disponível no momento.</p>
              <p className="text-xs text-[var(--color-text-muted)]">Entre em contato diretamente pelo WhatsApp para agendar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {company.bookingConfigs.map((config) => {
                const services = config.serviceTypes.map((st) => st.serviceType);
                return (
                  <div
                    key={config.id}
                    className="card-tactile bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-panel)] p-6 space-y-4 shadow-xs hover:border-[var(--color-border-strong)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg text-[var(--color-text-heading)]">{config.name}</h3>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          Escolha seus serviços e selecione o melhor horário
                        </p>
                      </div>
                      <Link
                        href={`/book/${companySlug}/${config.id}`}
                        className="btn-tactile px-5 py-2.5 text-white text-xs font-bold rounded-[var(--radius-control)] shadow-xs shrink-0 inline-flex items-center gap-1.5"
                        style={{ backgroundColor: brandColor }}
                      >
                        <span>Agendar</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Services Included Preview */}
                    <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)] pt-3">
                      {services.slice(0, 4).map((srv) => (
                        <div key={srv.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-[var(--color-text-heading)]">{srv.name}</p>
                            {srv.estimatedMinutes && (
                              <p className="text-[var(--text-2xs)] text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>{srv.estimatedMinutes} min</span>
                              </p>
                            )}
                          </div>
                          <span className="font-semibold text-[var(--color-text-heading)] text-xs">
                            {formatMoney(Number(srv.price), company.currency, company.locale)}
                          </span>
                        </div>
                      ))}
                      {services.length > 4 && (
                        <div className="pt-2 text-center">
                          <Link
                            href={`/book/${companySlug}/${config.id}`}
                            className="text-xs font-bold hover:underline text-[var(--color-text)]"
                          >
                            + Ver todos os {services.length} serviços disponíveis →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Trust & Guarantee Footer Banner */}
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius-card)] p-4 text-center text-xs text-[var(--color-text-muted)] flex items-center justify-center gap-2 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-[var(--color-success)]" />
          <span>Agendamento protegido · Confirmação instantânea via WhatsApp</span>
        </div>
      </main>

      {/* Floating Bottom Dock for Mobile */}
      {primaryBookingHref && (
        <div className="dock-mobile bg-[var(--color-bg)] backdrop-blur-xl border border-[var(--color-border)] p-3 sm:hidden z-50 shadow-lg">
          <Link
            href={primaryBookingHref}
            className="btn-tactile w-full py-3 px-4 text-white font-bold text-xs rounded-[var(--radius-control)] shadow-xs flex items-center justify-center gap-2 uppercase tracking-wider"
            style={{ backgroundColor: brandColor }}
          >
            <Calendar className="w-4 h-4" />
            <span>Agendar Atendimento Online</span>
          </Link>
        </div>
      )}
    </div>
  );
}
