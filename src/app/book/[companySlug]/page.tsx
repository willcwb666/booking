import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getReviewStats } from "@/server/queries/reviews";
import { formatMoney } from "@/lib/format";
import {
  MapPin,
  Phone,
  Calendar,
  Star,
  Clock,
  Instagram,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export default async function CompanyPublicPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  const company = await db.company.findFirst({
    where: { slug: companySlug, isActive: true },
    include: {
      bookingConfigs: {
        where: { status: "PUBLISHED" },
        include: {
          serviceTypes: {
            include: {
              serviceType: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  estimatedMinutes: true,
                  service: { select: { name: true } },
                },
              },
            },
          },
          extraServices: {
            include: {
              extraService: {
                select: { id: true, name: true, price: true, estimatedMinutes: true },
              },
            },
          },
          _count: { select: { estimates: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!company) notFound();

  const reviewStats = await getReviewStats(company.id);

  // Formatar número de WhatsApp caso exista
  const cleanPhone = company.phone ? company.phone.replace(/\D/g, "") : null;
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Olá! Gostaria de tirar uma dúvida com a equipe da ${company.name}.`)}`
    : null;

  // Primeiro link de agendamento disponível
  const primaryBookingHref =
    company.bookingConfigs.length > 0
      ? `/book/${companySlug}/${company.bookingConfigs[0].id}`
      : null;

  const brandColor = company.brandColor || "#635bff";

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900 pb-24 selection:bg-slate-900 selection:text-white"
      style={{ "--tenant-brand": brandColor } as React.CSSProperties}
    >
      {/* Banner / Cover */}
      <div className="relative h-44 sm:h-56 bg-slate-900 overflow-hidden" style={{ backgroundColor: brandColor }}>
        {company.coverImageUrl && (
          <img
            src={company.coverImageUrl}
            alt={company.name}
            className="w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
      </div>

      {/* Main Profile Card Container */}
      <main className="max-w-2xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-10 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Logo Avatar */}
            <div
              className="w-24 h-24 rounded-2xl border-4 border-white shadow-md flex items-center justify-center shrink-0 overflow-hidden text-white"
              style={{ backgroundColor: brandColor }}
            >
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-3xl font-black">
                  {company.name[0]?.toUpperCase()}
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {company.name}
                </h1>
                <span
                  title="Empresa Verificada"
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold gap-1"
                  style={{ color: brandColor, backgroundColor: `${brandColor}18` }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verificado</span>
                </span>
              </div>

              {/* Tagline / Subtitle */}
              <p className="text-xs text-slate-500 max-w-md">
                {company.heroSubtitle || "Atendimento profissional com agendamento online rápido e seguro."}
              </p>

              {/* Rating & Details */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-600">
                {reviewStats.count > 0 && reviewStats.average !== null ? (
                  <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{reviewStats.average.toFixed(1)}</span>
                    <span className="text-slate-400 font-normal">({reviewStats.count})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5" />
                    <span>Novo</span>
                  </div>
                )}

                {company.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate max-w-[200px]">{company.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Social & Contact Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-6 mt-6 border-t border-slate-100">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
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
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold transition-colors"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>Instagram</span>
              </a>
            )}

            {company.phone && (
              <a
                href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Ligar</span>
              </a>
            )}
          </div>
        </div>

        {/* Catalog of Services / Booking Options */}
        <section aria-labelledby="services-heading" className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 id="services-heading" className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Serviços & Agendamento Online
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Disponibilidade 24/7
            </span>
          </div>

          {company.bookingConfigs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Nenhum serviço disponível no momento.</p>
              <p className="text-xs text-slate-400">Entre em contato diretamente pelo WhatsApp para agendar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {company.bookingConfigs.map((config) => {
                const services = config.serviceTypes.map((st) => st.serviceType);
                return (
                  <div
                    key={config.id}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs hover:border-indigo-300 transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">{config.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Escolha seus serviços e selecione o melhor horário
                        </p>
                      </div>
                      <Link
                        href={`/book/${companySlug}/${config.id}`}
                        className="px-5 py-2.5 text-white text-xs font-extrabold rounded-xl shadow-xs transition-opacity hover:opacity-90 shrink-0 inline-flex items-center gap-1.5"
                        style={{ backgroundColor: brandColor }}
                      >
                        <span>Agendar</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Services Included Preview */}
                    <div className="divide-y divide-slate-100 border-t border-slate-100 pt-3">
                      {services.slice(0, 4).map((srv) => (
                        <div key={srv.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{srv.name}</p>
                            {srv.estimatedMinutes && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>{srv.estimatedMinutes} min</span>
                              </p>
                            )}
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs">
                            {formatMoney(Number(srv.price), company.currency, company.locale)}
                          </span>
                        </div>
                      ))}
                      {services.length > 4 && (
                        <div className="pt-2 text-center">
                          <Link
                            href={`/book/${companySlug}/${config.id}`}
                            className="text-xs font-bold hover:underline"
                            style={{ color: brandColor }}
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
        <div className="bg-slate-100/80 rounded-2xl p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Agendamento protegido · Confirmação instantânea via WhatsApp</span>
        </div>
      </main>

      {/* Floating Bottom Bar for Mobile */}
      {primaryBookingHref && (
        <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-3 sm:hidden z-50">
          <Link
            href={primaryBookingHref}
            className="w-full py-3 px-4 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all uppercase tracking-wider"
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
