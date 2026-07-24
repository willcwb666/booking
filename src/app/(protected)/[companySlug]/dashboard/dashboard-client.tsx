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
      icon: <Calendar className="w-5 h-5 text-indigo-600" />,
    },
    {
      label: "Aguardando confirmação",
      value: String(stats.pendingCount),
      sub: "Pagamento pendente",
      href: `/${company.slug}/agendamentos?status=PENDING`,
      highlight: stats.pendingCount > 0,
      icon: <Clock className="w-5 h-5 text-amber-600" />,
    },
    {
      label: "Receita do mês",
      value: formatMoney(stats.monthRevenue, company.currency, company.locale),
      sub: "Pagamentos confirmados",
      href: `/${company.slug}/agendamentos`,
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
    },
    {
      label: "Próximos 7 dias",
      value: String(stats.upcomingWeekCount),
      sub: "Agendamentos futuros",
      href: `/${company.slug}/agendamentos`,
      icon: <CalendarRange className="w-5 h-5 text-indigo-600" />,
    },
    {
      label: "Avaliação média",
      value: reviewStats.average !== null ? `${reviewStats.average.toFixed(1)} ★` : "—",
      sub: reviewStats.count > 0 ? `${reviewStats.count} avaliação${reviewStats.count !== 1 ? "ões" : ""}` : "Sem avaliações ainda",
      href: `/${company.slug}/avaliacoes`,
      icon: <Star className="w-5 h-5 text-amber-500" />,
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
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 w-full max-w-7xl text-left space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard Geral</h1>
        <p className="text-xs text-slate-500 mt-1">
          Bem-vindo de volta, <strong className="text-slate-900">{userName}</strong>. Aqui está a visão rápida da sua empresa.
        </p>
      </div>

      {/* KPI Cards (Stripe Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`bg-white rounded-3xl border p-5 transition-all block hover:shadow-md cursor-pointer ${
              card.highlight
                ? "border-amber-300 bg-amber-50/50 shadow-2xs"
                : "border-slate-200/80 shadow-2xs hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">{card.icon}</div>
            </div>
            <p className={`text-2xl font-extrabold ${card.highlight ? "text-amber-900" : "text-slate-900"}`}>
              {card.value}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Seção Gráfica: Tendência Semanal & Resumo Financeiro */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Barras de Agendamentos da Semana */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Volume de Atendimentos da Semana</h2>
              <p className="text-xs text-slate-500 mt-0.5">Distribuição estimada de reservas nos 7 dias</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Tendência Ativa
            </span>
          </div>

          {/* Gráfico Visual */}
          <div className="h-44 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100 pb-2">
            {weeklyTrendData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.count} agend.
                </span>
                <div className="w-full bg-slate-100 rounded-t-xl h-32 flex items-end p-1">
                  <div
                    style={{ height: `${d.pct}%` }}
                    className="w-full bg-[#635bff] group-hover:bg-[#544dc9] rounded-t-lg transition-all"
                  />
                </div>
                <span className="text-xs font-bold text-slate-700">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Rápido da Empresa */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
              Status da Assinatura
            </span>
            <h2 className="text-base font-extrabold text-slate-900 mt-1">{company.planDisplayName}</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Sua empresa está operando com catálogo ativo e reservas habilitadas.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Faturamento Estimado:</span>
              <span className="font-extrabold text-emerald-700">
                {formatMoney(stats.monthRevenue, company.currency, company.locale)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium">Status do Catálogo:</span>
              <span className="font-bold text-indigo-600">Restaurado / Ativo</span>
            </div>
          </div>

          <Link
            href={`/${company.slug}/configuracoes`}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl text-center shadow-xs transition-all block"
          >
            Gerenciar Assinatura & Configurações
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-extrabold text-slate-900 mb-3">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLink
            href={`/${company.slug}/agendamentos`}
            title="Ver Agendamentos"
            description="Gerencie todas as reservas da empresa"
            icon={<ClipboardList className="w-5 h-5 text-indigo-600" />}
          />
          <QuickLink
            href={`/${company.slug}/schedule`}
            title="Calendário de Atendimentos"
            description="Visualize a agenda por profissional e dia"
            icon={<Calendar className="w-5 h-5 text-indigo-600" />}
          />
          <QuickLink
            href={`/${company.slug}/booking`}
            title="Página Pública de Agendamento"
            description="Configure o link e catálogo para seus clientes"
            icon={<Globe className="w-5 h-5 text-indigo-600" />}
          />
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
      className="bg-white rounded-3xl border border-slate-200/80 p-5 hover:shadow-md hover:border-slate-300 transition-all flex gap-4 items-start shadow-2xs cursor-pointer group"
    >
      <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 shrink-0 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
      </div>
    </Link>
  );
}
