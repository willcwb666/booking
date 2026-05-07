"use client";

import Link from "next/link";
import { useCompany } from "@/lib/company-context";
import type { BookingDashboardStats } from "@/server/queries/bookings";

type Props = {
  userName: string;
  company: {
    name: string;
    slug: string;
    businessType: string;
    planTier: string;
    planDisplayName: string;
    role: string;
  };
  stats: BookingDashboardStats;
  reviewStats: { average: number | null; count: number };
};

export function DashboardClient({ userName, stats, reviewStats }: Props) {
  const company = useCompany();

  const cards = [
    {
      label: "Agendamentos hoje",
      value: String(stats.todayCount),
      sub: "Confirmados e pendentes",
      href: `/${company.slug}/agendamentos`,
    },
    {
      label: "Aguardando confirmação",
      value: String(stats.pendingCount),
      sub: "Pagamento pendente",
      href: `/${company.slug}/agendamentos?status=PENDING`,
      highlight: stats.pendingCount > 0,
    },
    {
      label: "Receita do mês",
      value: stats.monthRevenue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      sub: "Pagamentos confirmados",
      href: `/${company.slug}/agendamentos`,
    },
    {
      label: "Próximos 7 dias",
      value: String(stats.upcomingWeekCount),
      sub: "Agendamentos futuros",
      href: `/${company.slug}/agendamentos`,
    },
    {
      label: "Avaliação média",
      value: reviewStats.average !== null ? `${reviewStats.average.toFixed(1)} ★` : "—",
      sub: reviewStats.count > 0 ? `${reviewStats.count} avaliação${reviewStats.count !== 1 ? "ões" : ""}` : "Sem avaliações ainda",
      href: `/${company.slug}/avaliacoes`,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bem-vindo de volta, {userName}.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={[
              "bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow block",
              card.highlight ? "border-yellow-300 bg-yellow-50" : "border-gray-200",
            ].join(" ")}
          >
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{card.label}</p>
            <p
              className={[
                "text-2xl font-bold",
                card.highlight ? "text-yellow-700" : "text-gray-900",
              ].join(" ")}
            >
              {card.value}
            </p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickLink
          href={`/${company.slug}/agendamentos`}
          title="Ver agendamentos"
          description="Gerencie todos os agendamentos da empresa"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
          }
        />
        <QuickLink
          href={`/${company.slug}/schedule`}
          title="Calendário"
          description="Visualize a agenda da equipe"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
          }
        />
        <QuickLink
          href={`/${company.slug}/booking`}
          title="Configs de booking"
          description="Configure os fluxos de agendamento público"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow flex gap-4 items-start"
    >
      <span className="text-blue-500 shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </Link>
  );
}
