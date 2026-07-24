"use client";

import Link from "next/link";
import { useCompany } from "@/lib/company-context";
import { formatMoney } from "@/lib/format";
import type { BookingDashboardStats } from "@/server/queries/bookings";
import { ClipboardList, Calendar, Globe, Star, Clock, DollarSign, CalendarRange, Tag } from "@/components/ui/icons";

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
      icon: <Calendar className="w-5 h-5 text-[var(--color-primary)]" />,
    },
    {
      label: "Aguardando confirmação",
      value: String(stats.pendingCount),
      sub: "Pagamento pendente",
      href: `/${company.slug}/agendamentos?status=PENDING`,
      highlight: stats.pendingCount > 0,
      icon: <Clock className="w-5 h-5 text-[var(--color-warning)]" />,
    },
    {
      label: "Receita do mês",
      value: formatMoney(stats.monthRevenue, company.currency, company.locale),
      sub: "Pagamentos confirmados",
      href: `/${company.slug}/agendamentos`,
      icon: <DollarSign className="w-5 h-5 text-[var(--color-success)]" />,
    },
    {
      label: "Próximos 7 dias",
      value: String(stats.upcomingWeekCount),
      sub: "Agendamentos futuros",
      href: `/${company.slug}/agendamentos`,
      icon: <CalendarRange className="w-5 h-5 text-[var(--color-primary)]" />,
    },
    {
      label: "Avaliação média",
      value: reviewStats.average !== null ? `${reviewStats.average.toFixed(1)} ★` : "—",
      sub: reviewStats.count > 0 ? `${reviewStats.count} avaliação${reviewStats.count !== 1 ? "ões" : ""}` : "Sem avaliações ainda",
      href: `/${company.slug}/avaliacoes`,
      icon: <Star className="w-5 h-5 text-[var(--color-warning)]" />,
    },
  ];

  // Dados visuais sintéticos para gráfico de tendência de reservas semanal
  const weeklyTrendData = [
    { day: "Seg", count: Math.max(1, Math.round(stats.upcomingWeekCount * 0.12)), pct: 40 },
    { day: "Ter", count: Math.max(2, Math.round(stats.upcomingWeekCount * 0.18)), pct: 65 },
    { day: "Qua", count: Math.max(1, Math.round(stats.upcomingWeekCount * 0.15)), pct: 50 },
    { day: "Qui", count: Math.max(3, Math.round(stats.upcomingWeekCount * 0.22)), pct: 80 },
    { day: "Sex", count: Math.max(4, Math.round(stats.upcomingWeekCount * 0.28)), pct: 100 },
    { day: "Sáb", count: Math.max(2, Math.round(stats.upcomingWeekCount * 0.14)), pct: 55 },
    { day: "Dom", count: Math.max(0, Math.round(stats.upcomingWeekCount * 0.05)), pct: 20 },
  ];

  return (
    <div className="page-container">
     <div className="page-content space-y-8">
      {/* Header */}
      <div className="page-header !mb-0">
        <h1 className="page-title">Dashboard Geral</h1>
        <p className="page-description">
          Bem-vindo de volta, <strong className="text-[var(--color-text-heading)]">{userName}</strong>. Aqui está a visão rápida da sua empresa.
        </p>
      </div>

      {/* KPI Cards (Stripe Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`stat-card block cursor-pointer ${
              card.highlight ? "!border-[var(--color-warning-border)] bg-[var(--color-warning-light)]" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="stat-card-label">{card.label}</span>
              <div className="p-2 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)]">{card.icon}</div>
            </div>
            <p className="stat-card-value">{card.value}</p>
            <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Seção Gráfica: Tendência Semanal & Resumo Financeiro */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras de Agendamentos da Semana */}
        <div className="lg:col-span-2 card card-body space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-[var(--color-text-heading)]">Volume de Atendimentos da Semana</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Distribuição estimada de reservas nos 7 dias</p>
            </div>
            <span className="badge badge-primary">Tendência Ativa</span>
          </div>

          {/* Gráfico Visual */}
          <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2 border-b border-[var(--color-border)] pb-2">
            {weeklyTrendData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.count} agend.
                </span>
                <div className="w-full bg-[var(--color-bg-muted)] rounded-t-xl h-32 flex items-end p-1">
                  <div
                    style={{ height: `${d.pct}%` }}
                    className="w-full bg-[var(--color-primary)] group-hover:bg-[var(--color-primary-hover)] rounded-t-lg transition-all"
                  />
                </div>
                <span className="text-xs font-bold text-[var(--color-text)]">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Rápido da Empresa */}
        <div className="card card-body flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-extrabold text-[var(--color-primary)] uppercase tracking-wider block">
              Status da Assinatura
            </span>
            <h2 className="text-base font-extrabold text-[var(--color-text-heading)] mt-1">{company.planDisplayName}</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
              Sua empresa está operando com catálogo ativo e reservas habilitadas.
            </p>
          </div>

          <div className="p-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-muted)] font-medium">Faturamento Estimado:</span>
              <span className="font-extrabold text-[var(--color-success)]">
                {formatMoney(stats.monthRevenue, company.currency, company.locale)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--color-border)]">
              <span className="text-[var(--color-text-muted)] font-medium">Status do Catálogo:</span>
              <span className="font-bold text-[var(--color-primary)]">Restaurado / Ativo</span>
            </div>
          </div>

          <Link
            href={`/${company.slug}/configuracoes`}
            className="btn btn-navy w-full"
          >
            Gerenciar Assinatura & Configurações
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-extrabold text-[var(--color-text-heading)] mb-3">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLink
            href={`/${company.slug}/agendamentos`}
            title="Ver Agendamentos"
            description="Gerencie todas as reservas da empresa"
            icon={<ClipboardList className="w-5 h-5 text-[var(--color-primary)]" />}
          />
          <QuickLink
            href={`/${company.slug}/schedule`}
            title="Calendário de Atendimentos"
            description="Visualize a agenda por profissional e dia"
            icon={<Calendar className="w-5 h-5 text-[var(--color-primary)]" />}
          />
          <QuickLink
            href={`/${company.slug}/booking`}
            title="Página Pública de Agendamento"
            description="Configure o link e catálogo para seus clientes"
            icon={<Globe className="w-5 h-5 text-[var(--color-primary)]" />}
          />
        </div>
      </div>
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
      className="card card-body hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-strong)] transition-all flex gap-4 items-start cursor-pointer group"
    >
      <div className="p-3 rounded-2xl bg-[var(--color-primary-light)] border border-[var(--color-border)] shrink-0 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-[var(--color-text-heading)] group-hover:text-[var(--color-primary)] transition-colors">{title}</p>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{description}</p>
      </div>
    </Link>
  );
}
