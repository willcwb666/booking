import { db } from "@/lib/db";
import Link from "next/link";
import { Metadata } from "next";
import { KreatorLogo } from "@/components/ui/kreator-logo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Diretório de Empresas & Serviços — Agendamento Online",
  description:
    "Busque oficinas mecânicas, barbearias, pet shops, estúdios e diaristas. Agende horários e aprove orçamentos online com confirmação imediata via WhatsApp.",
  openGraph: {
    title: "Diretório de Empresas & Serviços — Kreator",
    description:
      "Busque e agende serviços online com os melhores profissionais e estabelecimentos da sua região.",
  },
};

const BUSINESS_LABELS: Record<string, string> = {
  HOME_CLEANING: "Limpeza residencial",
  PET_GROOMER:   "Pet grooming",
  CAR_WASH:      "Lava-rápido",
  POOL_CLEANING: "Limpeza de piscina",
  LAWN_CARE:     "Jardinagem",
  BARBER:        "Barbearia",
  HAIR_SALON:    "Salão de beleza",
  PHOTOGRAPHER:  "Fotografia",
  MECHANIC:      "Oficina Mecânica",
  OTHER:         "Outros",
};

export const revalidate = 60; // revalida a cada 60s

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const { q, tipo } = await searchParams;

  let companies: Array<{
    id: string;
    name: string;
    slug: string;
    businessType: string;
    logoUrl: string | null;
    address: string | null;
    _count: { bookings: number; reviews: number };
  }> = [];

  try {
    const rows = await db.company.findMany({
      where: {
        isActive: true,
        ...(tipo ? { businessType: tipo as never } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        businessType: true,
        logoUrl: true,
        address: true,
        _count: {
          select: {
            bookings: { where: { status: "COMPLETED" } },
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    companies = rows;
  } catch {
    let whereClause = `WHERE c."isActive" = true`;
    if (tipo) {
      whereClause += ` AND c."businessType" = '${tipo.replace(/'/g, "''")}'`;
    }
    if (q) {
      whereClause += ` AND c.name ILIKE '%${q.replace(/'/g, "''")}%'`;
    }

    const sql = `
      SELECT 
        c.id, c.name, c.slug, c."businessType", c."logoUrl", c.address,
        (SELECT COUNT(*)::int FROM "booking" b WHERE b."companyId" = c.id AND b.status = 'COMPLETED') as "bookingCount",
        (SELECT COUNT(*)::int FROM "review" r WHERE r."companyId" = c.id) as "reviewCount"
      FROM "company" c
      ${whereClause}
      ORDER BY c."createdAt" DESC
      LIMIT 60
    `;

    const rawRows = await db.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      slug: string;
      businessType: string;
      logoUrl: string | null;
      address: string | null;
      bookingCount: number;
      reviewCount: number;
    }>>(sql);

    companies = rawRows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      businessType: r.businessType,
      logoUrl: r.logoUrl,
      address: r.address,
      _count: {
        bookings: Number(r.bookingCount || 0),
        reviews: Number(r.reviewCount || 0),
      },
    }));
  }

  const tipos = Object.entries(BUSINESS_LABELS);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[var(--color-text-heading)] selection:bg-[var(--color-navy)] selection:text-white font-sans antialiased">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 bg-[var(--color-bg)] backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Kreator Início">
            <KreatorLogo size={28} textClassName="font-semibold text-[var(--color-text-heading)] text-lg" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/register"
              className="btn-tactile text-xs font-bold bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy)] px-4 py-2 rounded-full shadow-xs"
            >
              Cadastrar Empresa
            </Link>
            <Link href="/login" className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] px-2 py-1 transition-colors">
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-7">
        <Breadcrumbs
          items={[
            { name: "Início", url: "/" },
            { name: "Diretório de Empresas", url: "/empresas" },
          ]}
        />

        <div className="space-y-1.5">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--color-text-heading)]">
            Encontre Serviços <span className="font-serif italic font-normal text-[var(--color-success)]">& Estabelecimentos</span>
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm font-medium">
            Agende horários online em segundos com confirmação imediata via WhatsApp.
          </p>
        </div>

        {/* Search + filter form */}
        <form method="get" className="bg-[var(--color-bg)] border border-[var(--color-border)] p-5 rounded-[var(--radius-panel)] space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome da empresa ou serviço..."
              className="flex-1 border border-[var(--color-border)] rounded-[var(--radius-card)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] bg-[var(--color-bg-subtle)] text-[var(--color-text-heading)] placeholder-[var(--color-text-subtle)]"
              aria-label="Buscar empresa por nome"
            />
            <select
              name="tipo"
              defaultValue={tipo}
              className="border border-[var(--color-border)] rounded-[var(--radius-card)] px-4 py-3 text-sm bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] font-medium"
              aria-label="Filtrar por tipo de negócio"
            >
              <option value="">Todos os segmentos</option>
              {tipos.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="btn-tactile px-8 py-3 bg-[var(--color-navy)] text-white text-sm font-bold rounded-[var(--radius-card)] shadow-xs hover:bg-[var(--color-navy)]"
            >
              Buscar
            </button>
          </div>

          {/* Quick Segment Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--color-border)]">
            <Link
              href="/empresas"
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                !tipo
                  ? "bg-[var(--color-navy)] text-white font-semibold shadow-2xs"
                  : "bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] border border-[var(--color-border)]"
              }`}
            >
              Todos
            </Link>
            {tipos.slice(0, 7).map(([val, label]) => (
              <Link
                key={val}
                href={`/empresas?tipo=${val}`}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  tipo === val
                    ? "bg-[var(--color-navy)] text-white font-semibold shadow-2xs"
                    : "bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] border border-[var(--color-border)]"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </form>

        {companies.length === 0 ? (
          <div className="p-16 rounded-[var(--radius-panel)] bg-[var(--color-bg)] border border-[var(--color-border)] text-center space-y-3 shadow-xs">
            <span className="text-4xl block">🔍</span>
            <h3 className="text-lg font-semibold text-[var(--color-text-heading)]">Nenhuma empresa encontrada</h3>
            <p className="text-[var(--color-text-muted)] text-xs max-w-sm mx-auto">
              Tente buscar por outro termo ou selecione todos os segmentos de serviços.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/book/${c.slug}`}
                className="card-tactile rounded-[var(--radius-panel)] p-6 bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] group flex flex-col justify-between shadow-xs hover:shadow-md transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {c.logoUrl ? (
                      <img
                        src={c.logoUrl}
                        alt={`Logotipo da empresa ${c.name}`}
                        className="w-12 h-12 rounded-[var(--radius-card)] object-cover border border-[var(--color-border)] shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] border border-[var(--color-border)] text-[var(--color-text-heading)] font-serif font-semibold text-xl flex items-center justify-center shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--color-text-heading)] text-base truncate group-hover:text-[var(--color-success)] transition-colors">
                        {c.name}
                      </p>
                      <span className="inline-block text-[var(--text-2xs)] font-bold text-[var(--color-success)] bg-[var(--color-success-light)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--color-success-border)] mt-1">
                        {BUSINESS_LABELS[c.businessType] ?? c.businessType}
                      </span>
                    </div>
                  </div>

                  {c.address && (
                    <p className="text-xs text-[var(--color-text-muted)] flex items-start gap-1.5 truncate">
                      <span className="shrink-0">📍</span>
                      <span className="truncate">{c.address}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--color-border)] text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--color-text-muted)] font-medium">
                      <strong className="text-[var(--color-text-heading)]">{c._count.bookings}</strong> serviços
                    </span>
                    {c._count.reviews > 0 && (
                      <span className="text-[var(--color-warning)] font-bold flex items-center gap-1">
                        ★ {c._count.reviews}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-[var(--color-text-heading)] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Agendar →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-muted)] py-8 text-center text-xs text-[var(--color-text-muted)] mt-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Kreator. Todos os direitos reservados.</p>
          <div className="flex gap-4 font-semibold text-[var(--color-text-muted)]">
            <Link href="/privacidade" className="hover:text-[var(--color-text-heading)] underline">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-[var(--color-text-heading)] underline">
              Termos
            </Link>
            <Link href="/" className="hover:text-[var(--color-text-heading)] underline">
              Início
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
