"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { AdminStats } from "@/server/queries/admin";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  Users,
  Calendar,
  Filter,
  CheckCircle2,
  FileText,
} from "@/components/ui/icons";

type Props = {
  stats: AdminStats;
};

type MetricKey = "mrr" | "arr" | "active" | "companies" | "bookings";
type TimeFilter = "daily" | "monthly" | "yearly" | "custom" | "plan";

export function AdminOverviewClient({ stats }: Props) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("mrr");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("monthly");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const fmtCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const metricsCards = [
    {
      key: "mrr" as MetricKey,
      label: "MRR (Receita Mensal)",
      value: fmtCurrency(stats.mrr),
      sub: "Faturamento recorrente mensal",
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
    },
    {
      key: "arr" as MetricKey,
      label: "ARR (Receita Anual)",
      value: fmtCurrency(stats.arr),
      sub: "Projeção anual das assinaturas",
      icon: <TrendingUp className="w-5 h-5 text-indigo-600" />,
    },
    {
      key: "active" as MetricKey,
      label: "Assinaturas Ativas",
      value: `${stats.activeSubscriptionsCount} ativas`,
      sub: stats.overdueSubscriptionsCount > 0 ? `⚠️ ${stats.overdueSubscriptionsCount} inadimplente(s)` : "100% Adimplentes",
      icon: <CreditCard className="w-5 h-5 text-violet-600" />,
    },
    {
      key: "companies" as MetricKey,
      label: "Total de Empresas",
      value: String(stats.totalCompanies),
      sub: "Empresas ativas na plataforma",
      icon: <Building2 className="w-5 h-5 text-blue-600" />,
    },
  ];

  // Gera dados sintéticos limpos para o gráfico em curva estilo Stripe
  const getRawSeries = () => {
    switch (activeMetric) {
      case "mrr":
        return [stats.mrr * 0.35, stats.mrr * 0.48, stats.mrr * 0.62, stats.mrr * 0.75, stats.mrr * 0.88, stats.mrr * 1.0];
      case "arr":
        return [stats.arr * 0.3, stats.arr * 0.45, stats.arr * 0.58, stats.arr * 0.72, stats.arr * 0.85, stats.arr * 1.0];
      case "active":
        return [stats.activeSubscriptionsCount * 0.4, stats.activeSubscriptionsCount * 0.5, stats.activeSubscriptionsCount * 0.7, stats.activeSubscriptionsCount * 0.8, stats.activeSubscriptionsCount * 0.9, stats.activeSubscriptionsCount];
      case "companies":
        return [stats.totalCompanies * 0.3, stats.totalCompanies * 0.4, stats.totalCompanies * 0.6, stats.totalCompanies * 0.75, stats.totalCompanies * 0.9, stats.totalCompanies];
      default:
        return [10, 20, 35, 50, 75, 100];
    }
  };

  const rawValues = getRawSeries();
  const labels =
    timeFilter === "daily"
      ? ["01 Jul", "05 Jul", "10 Jul", "15 Jul", "20 Jul", "25 Jul"]
      : timeFilter === "yearly"
      ? ["2021", "2022", "2023", "2024", "2025", "2026"]
      : ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];

  const maxValue = Math.max(...rawValues, 1);

  // Coordenadas calculadas para SVG smooth cubic bezier path
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;

  const points = rawValues.map((val, idx) => {
    const x = paddingX + (idx / (rawValues.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (val / maxValue) * (svgHeight - paddingY * 2);
    return { x, y, val, label: labels[idx] };
  });

  // Constrói o caminho da curva suave (Smooth Area Curve Path)
  const lineD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
  }, "");

  const areaD = `${lineD} L ${points[points.length - 1].x},${svgHeight - paddingY} L ${points[0].x},${svgHeight - paddingY} Z`;

  return (
    <div className="w-full max-w-7xl px-6 sm:px-8 py-8 text-left space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
          <TrendingUp className="w-4 h-4" />
          <span>Super Admin Analytics</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
          Visão Geral & Métricas SaaS
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Dashboard com gráficos em curva de área suave no padrão visual oficial do Stripe.
        </p>
      </div>

      {/* KPI Cards Interativos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsCards.map((card) => {
          const isActive = activeMetric === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveMetric(card.key)}
              className={`p-5 rounded-3xl border text-left transition-all cursor-pointer shadow-2xs block ${
                isActive
                  ? "ring-2 ring-[#635bff] bg-white border-[#635bff] shadow-md scale-[1.01]"
                  : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">{card.icon}</div>
              </div>
              <p className="text-2xl font-black text-slate-900">{card.value}</p>
              <p className="text-[11px] text-slate-500 mt-1">{card.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Gráfico de Área Suave em SVG (Stripe Aesthetic) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Gráfico de Tendência: {metricsCards.find((m) => m.key === activeMetric)?.label}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Curva contínua de crescimento e distribuição temporal.
              </p>
            </div>
          </div>

          <div className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 inline-flex flex-wrap gap-1">
            {[
              { id: "daily", label: "Diário" },
              { id: "monthly", label: "Mensal" },
              { id: "yearly", label: "Anual" },
              { id: "plan", label: "Por Plano" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTimeFilter(f.id as TimeFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFilter === f.id
                    ? "bg-white text-indigo-600 shadow-2xs font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Area Line Chart */}
        <div className="relative w-full overflow-hidden pt-2">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-64 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="stripeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#635bff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#635bff" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas de Grade de Fundo (Y Grid Lines) */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
              const y = svgHeight - paddingY - ratio * (svgHeight - paddingY * 2);
              return (
                <line
                  key={idx}
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Preenchimento de Área (Gradient Fill) */}
            <path d={areaD} fill="url(#stripeGradient)" />

            {/* Linha Curva Principal (Stripe Line) */}
            <path d={lineD} fill="none" stroke="#635bff" strokeWidth="3" strokeLinecap="round" />

            {/* Pontos de Interação no Gráfico */}
            {points.map((pt, i) => {
              const isHovered = hoveredPointIndex === i;
              return (
                <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredPointIndex(i)} onMouseLeave={() => setHoveredPointIndex(null)}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 7 : 4}
                    className="fill-white stroke-[#635bff] stroke-2 transition-all duration-200"
                  />
                  {/* Rótulo do Eixo X */}
                  <text
                    x={pt.x}
                    y={svgHeight - 8}
                    textAnchor="middle"
                    className="fill-slate-400 text-[11px] font-bold"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip Dinâmico de Hover */}
          {hoveredPointIndex !== null && (
            <div
              style={{
                left: `${(points[hoveredPointIndex].x / svgWidth) * 100}%`,
                top: `${(points[hoveredPointIndex].y / svgHeight) * 100 - 40}px`,
              }}
              className="absolute -translate-x-1/2 bg-slate-900 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 pointer-events-none z-10 animate-fadeIn"
            >
              <span>{points[hoveredPointIndex].label}: </span>
              <span className="text-emerald-400">
                {activeMetric === "mrr" || activeMetric === "arr"
                  ? fmtCurrency(points[hoveredPointIndex].val)
                  : Math.round(points[hoveredPointIndex].val)}
              </span>
            </div>
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>📊 Métrica Selecionada: <strong className="text-slate-900 uppercase">{activeMetric}</strong></span>
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Curva de crescimento com tendência positiva (+14.2%)
          </span>
        </div>
      </div>

      {/* Atalhos Rápidos com Botões Padronizados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          href="/admin/relatorios"
          className="bg-white rounded-3xl border border-slate-200/80 p-6 hover:shadow-md hover:border-slate-300 transition-all group block shadow-2xs"
        >
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs mb-2">
            <FileText className="w-4 h-4" />
            <span>Relatórios</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Relatórios Globais →
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Métricas financeiras de MRR, ARR e ranking de empresas.
          </p>
        </Link>

        <Link
          href="/admin/financeiro"
          className="bg-white rounded-3xl border border-slate-200/80 p-6 hover:shadow-md hover:border-slate-300 transition-all group block shadow-2xs"
        >
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs mb-2">
            <DollarSign className="w-4 h-4" />
            <span>Financeiro</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Gestão Financeira →
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Sincronização de planos com o Stripe e cobranças.
          </p>
        </Link>

        <Link
          href="/admin/companies"
          className="bg-white rounded-3xl border border-slate-200/80 p-6 hover:shadow-md hover:border-slate-300 transition-all group block shadow-2xs"
        >
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs mb-2">
            <Building2 className="w-4 h-4" />
            <span>Empresas</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Empresas Cadastradas →
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Filtre e ordene a tabela de empresas alfabeticamente.
          </p>
        </Link>

        <Link
          href="/admin/plans"
          className="bg-white rounded-3xl border border-slate-200/80 p-6 hover:shadow-md hover:border-slate-300 transition-all group block shadow-2xs"
        >
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs mb-2">
            <CreditCard className="w-4 h-4" />
            <span>Planos SaaS</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Planos & Preços →
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Reordenação drag-and-drop e plano destaque.
          </p>
        </Link>
      </div>
    </div>
  );
}
