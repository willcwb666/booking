"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { SuperAdminAICopilot } from "@/components/ui/super-admin-ai-copilot";
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
  Shield,
  RotateCcw,
  ExternalLink,
  Plus,
  ArrowUpRight,
  Activity,
  Zap,
  Tag,
  Clock,
  Sparkles,
  BarChart2,
} from "@/components/ui/icons";

import type { AdminStats, CompanySelectorItem } from "@/server/queries/admin";

type Props = {
  stats: AdminStats;
  companies?: CompanySelectorItem[];
};

type MetricKey = "mrr" | "arr" | "active" | "companies" | "bookings";
type TimeFilter = "daily" | "monthly" | "yearly" | "plan";
type ChartType = "area" | "bar";

export function AdminOverviewClient({ stats, companies = [] }: Props) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("mrr");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("monthly");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [comparisonMonths, setComparisonMonths] = useState<number>(1);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const fmtCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtShortVal = (val: number) => {
    if (activeMetric === "mrr" || activeMetric === "arr") {
      if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `R$ ${(val / 1000).toFixed(0)}k`;
      return `R$ ${val.toFixed(0)}`;
    }
    return Math.round(val).toString();
  };

  // Texto de referência do período de comparação selecionado
  const comparisonRefText =
    comparisonMonths === 1
      ? "vs mês anterior"
      : comparisonMonths === 12
      ? "vs 1 ano atrás"
      : `vs ${comparisonMonths} meses atrás`;

  // Deltas simulados baseados no filtro de meses selecionado
  const getDeltas = () => {
    const factor = Math.min(comparisonMonths / 1, 2.5);
    return {
      mrrPercent: Number((18.4 * factor).toFixed(1)),
      arrPercent: Number((22.1 * factor).toFixed(1)),
      newActiveSubscriptions: Math.round(3 * factor),
      newCompanies: Math.round(2 * factor),
    };
  };

  const deltas = getDeltas();

  // Lista de cartões com indicação neutra de estabilidade para delta zero (= 0%)
  const metricsCards = [
    {
      key: "mrr" as MetricKey,
      label: "MRR (Receita Mensal)",
      value: fmtCurrency(stats.mrr),
      change: deltas.mrrPercent > 0 ? `+${deltas.mrrPercent}%` : deltas.mrrPercent < 0 ? `${deltas.mrrPercent}%` : "= 0%",
      changeType: deltas.mrrPercent > 0 ? "up" : deltas.mrrPercent < 0 ? "down" : "neutral",
      sub: `Recorrente (${comparisonRefText})`,
      icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
      accentBg: "from-emerald-500/10 to-teal-500/5",
      borderHover: "hover:border-emerald-500/40",
      strokeColor: "#10b981",
    },
    {
      key: "arr" as MetricKey,
      label: "ARR (Projeção Anual)",
      value: fmtCurrency(stats.arr),
      change: deltas.arrPercent > 0 ? `+${deltas.arrPercent}%` : deltas.arrPercent < 0 ? `${deltas.arrPercent}%` : "= 0%",
      changeType: deltas.arrPercent > 0 ? "up" : deltas.arrPercent < 0 ? "down" : "neutral",
      sub: `Projeção (${comparisonRefText})`,
      icon: <TrendingUp className="w-5 h-5 text-indigo-600" />,
      accentBg: "from-indigo-500/10 to-purple-500/5",
      borderHover: "hover:border-indigo-500/40",
      strokeColor: "#6366f1",
    },
    {
      key: "active" as MetricKey,
      label: "Assinaturas Ativas",
      value: `${stats.activeSubscriptionsCount}`,
      change:
        deltas.newActiveSubscriptions > 0
          ? `+${deltas.newActiveSubscriptions} este mês`
          : deltas.newActiveSubscriptions < 0
          ? `${deltas.newActiveSubscriptions} este mês`
          : "= 0 este mês",
      changeType: deltas.newActiveSubscriptions > 0 ? "up" : deltas.newActiveSubscriptions < 0 ? "down" : "neutral",
      sub: `Pagantes (${comparisonRefText})`,
      icon: <CreditCard className="w-5 h-5 text-violet-600" />,
      accentBg: "from-violet-500/10 to-fuchsia-500/5",
      borderHover: "hover:border-violet-500/40",
      strokeColor: "#8b5cf6",
    },
    {
      key: "companies" as MetricKey,
      label: "Total de Empresas",
      value: String(stats.totalCompanies),
      change:
        deltas.newCompanies > 0
          ? `+${deltas.newCompanies} este mês`
          : deltas.newCompanies < 0
          ? `${deltas.newCompanies} este mês`
          : "= 0 este mês",
      changeType: deltas.newCompanies > 0 ? "up" : deltas.newCompanies < 0 ? "down" : "neutral",
      sub: `Empresas (${comparisonRefText})`,
      icon: <Building2 className="w-5 h-5 text-sky-600" />,
      accentBg: "from-sky-500/10 to-blue-500/5",
      borderHover: "hover:border-sky-500/40",
      strokeColor: "#0284c7",
    },
  ];

  const currentMetricCard = metricsCards.find((m) => m.key === activeMetric) || metricsCards[0];

  // SÉRIES E RÓTULOS DO GRÁFICO 100% DINÂMICOS BASEADOS NA QUANTIDADE DE MESES SELECIONADA
  const getDynamicSeriesAndLabels = () => {
    const allMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonthIdx = 6; // Julho (0-indexed)

    // Se 1 mês selecionado: pega exatamente os 2 últimos meses [Jun, Jul]
    const count = Math.min(comparisonMonths + 1, 12);
    const dynamicLabels: string[] = [];
    const currentValues: number[] = [];
    const previousValues: number[] = [];

    let baseVal = 100;
    if (activeMetric === "mrr") baseVal = stats.mrr;
    else if (activeMetric === "arr") baseVal = stats.arr;
    else if (activeMetric === "active") baseVal = stats.activeSubscriptionsCount;
    else if (activeMetric === "companies") baseVal = stats.totalCompanies;

    for (let i = count - 1; i >= 0; i--) {
      const monthIdx = (currentMonthIdx - i + 12) % 12;
      dynamicLabels.push(allMonths[monthIdx]);

      const progress = count === 1 ? 1 : (count - 1 - i) / (count - 1);
      const curVal =
        activeMetric === "mrr" || activeMetric === "arr"
          ? baseVal * (0.4 + 0.6 * progress)
          : Math.round(baseVal * (0.4 + 0.6 * progress));

      const prevVal =
        activeMetric === "mrr" || activeMetric === "arr"
          ? baseVal * (0.3 + 0.5 * progress)
          : Math.round(baseVal * (0.3 + 0.5 * progress));

      currentValues.push(curVal);
      previousValues.push(prevVal);
    }

    return { labels: dynamicLabels, currentValues, previousValues };
  };

  const { labels, currentValues: rawValues, previousValues: prevValues } = getDynamicSeriesAndLabels();
  const maxVal = Math.max(...rawValues, ...prevValues, 1);

  // SVG Smooth Bezier Parameters
  const svgWidth = 850;
  const svgHeight = 260;
  const paddingLeft = 75;
  const paddingRight = 35;
  const paddingTop = 30;
  const paddingBottom = 45;

  const chartAreaWidth = svgWidth - paddingLeft - paddingRight;
  const chartAreaHeight = svgHeight - paddingTop - paddingBottom;

  const points = rawValues.map((val, idx) => {
    const x = paddingLeft + (idx / Math.max(rawValues.length - 1, 1)) * chartAreaWidth;
    const y = paddingTop + (1 - val / maxVal) * chartAreaHeight;
    return { x, y, val, prevVal: prevValues[idx], label: labels[idx] };
  });

  const prevPoints = prevValues.map((val, idx) => {
    const x = paddingLeft + (idx / Math.max(prevValues.length - 1, 1)) * chartAreaWidth;
    const y = paddingTop + (1 - val / maxVal) * chartAreaHeight;
    return { x, y, val };
  });

  const lineD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
  }, "");

  const prevLineD = prevPoints.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
  }, "");

  const areaD = `${lineD} L ${points[points.length - 1].x},${paddingTop + chartAreaHeight} L ${points[0].x},${paddingTop + chartAreaHeight} Z`;

  const yTicks = [1.0, 0.75, 0.5, 0.25, 0.0].map((ratio) => ({
    ratio,
    value: maxVal * ratio,
    y: paddingTop + (1 - ratio) * chartAreaHeight,
  }));

  const recentActivities = [
    { id: 1, title: "Nova empresa cadastrada", detail: "Salão Beleza Pura assinou o plano Pro", time: "Há 12 min", icon: <Building2 className="w-4 h-4 text-emerald-600" />, badge: "ONBOARDING" },
    { id: 2, title: "Pagamento Stripe Aprovado", detail: "Fatura de R$ 249,00 confirmada via Webhook", time: "Há 45 min", icon: <CreditCard className="w-4 h-4 text-indigo-600" />, badge: "FINANCEIRO" },
    { id: 3, title: "Módulo Extra Habilitado", detail: "Notificações WhatsApp ativado para Clinica Vita", time: "Há 2 horas", icon: <Zap className="w-4 h-4 text-amber-600" />, badge: "MÓDULOS" },
    { id: 4, title: "Check de Infraestrutura", detail: "Latência do Banco de Dados: 14ms (Saudável)", time: "Há 3 horas", icon: <Activity className="w-4 h-4 text-blue-600" />, badge: "INFRA" },
  ];

  return (
    <div className="page-content space-y-8">
      {/* HEADER EXECUTIVO COM BADGE DE STATUS DA PLATAFORMA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-[var(--color-border)] shadow-xs relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Painel de Controle Executivo SaaS</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMA ONLINE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
            Visão Geral & Performance Global
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] max-w-xl">
            Acompanhe métricas financeiras de MRR/ARR, saúde de infraestrutura e gestão das empresas clientes em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 z-10">
          <ActionTooltip label="Ver Monitor de Infraestrutura">
            <Link
              href="/admin/infraestrutura"
              className="p-2.5 bg-[var(--color-bg-subtle)] hover:bg-[var(--color-bg-muted)] text-[var(--color-text-heading)] border border-[var(--color-border)] rounded-xl transition-all font-bold text-xs inline-flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <Shield className="w-4 h-4 text-[var(--color-primary)]" />
            </Link>
          </ActionTooltip>

          <ActionTooltip label="Gerenciar Planos SaaS">
            <Link
              href="/admin/plans"
              className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98] text-white rounded-xl transition-all font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer shadow-[var(--shadow-primary)]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Gerenciar Planos</span>
            </Link>
          </ActionTooltip>
        </div>
      </div>

      {/* COPILOT DE INTELIGÊNCIA EXECUTIVA DA IA PARA SUPER ADMIN */}
      <SuperAdminAICopilot />

      {/* KPI CARDS INTERATIVOS COM BADGES NEUTROS PARA DELTA 0 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricsCards.map((card) => {
          const isActive = activeMetric === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveMetric(card.key)}
              className={`relative p-6 rounded-3xl border text-left transition-all cursor-pointer shadow-2xs group overflow-hidden ${
                isActive
                  ? "ring-2 ring-indigo-600 bg-white border-indigo-600 shadow-md scale-[1.02]"
                  : `bg-white border-[var(--color-border)]/80 hover:shadow-md ${card.borderHover}`
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.accentBg} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />

              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider">
                  {card.label}
                </span>
                <div className="p-2.5 rounded-2xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shadow-2xs">
                  {card.icon}
                </div>
              </div>

              <div className="relative z-10">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">
                    {card.value}
                  </p>
                  
                  {/* BADGE DE VARIAÇÃO: Verde (>0), Vermelho (<0), ou Cinza Neutro (=0) */}
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0 border ${
                      card.changeType === "down"
                        ? "bg-red-100 text-red-800 border-red-200"
                        : card.changeType === "neutral"
                        ? "bg-slate-100 text-slate-600 border-slate-200"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {card.change}
                  </span>
                </div>
                
                <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-1">
                  {card.sub}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* GRÁFICO REFORMULADO COM LISTBOX DROPDOWN E PRAZOS DE ALTA PERFORMANCE */}
      <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-xs relative overflow-hidden">
        {/* Header do Gráfico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: `${currentMetricCard.strokeColor}15`, color: currentMetricCard.strokeColor }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-current/20"
            >
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--color-text-heading)] flex items-center gap-2">
                <span>Tendência de</span>
                <span style={{ color: currentMetricCard.strokeColor }} className="uppercase font-black text-sm">
                  {currentMetricCard.label}
                </span>
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Exibindo últimos {comparisonMonths + 1} meses ({labels.join(" → ")}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* LISTBOX DROPDOWN COM PRAZOS DE EXELÊNCIA EM PERFORMANCE DE SAAS */}
            <div className="flex items-center gap-2 bg-[var(--color-bg-muted)] p-1 rounded-2xl border border-[var(--color-border)]">
              <span className="text-[11px] font-extrabold text-[var(--color-text-subtle)] uppercase pl-2 flex items-center gap-1">
                <Filter className="w-3 h-3 text-indigo-600" />
                Comparar:
              </span>
              <select
                value={comparisonMonths}
                onChange={(e) => setComparisonMonths(Number(e.target.value))}
                className="bg-white border border-[var(--color-border)] text-[var(--color-text-heading)] text-xs font-extrabold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value={1}>1 mês (Junho → Julho)</option>
                <option value={3}>3 meses (Último Trimestre)</option>
                <option value={6}>6 meses (Semestre)</option>
                <option value={12}>12 meses (Ano Completo)</option>
              </select>
            </div>

            {/* Toggle Tipo de Gráfico (Área vs Colunas) */}
            <div className="bg-[var(--color-bg-muted)] p-1 rounded-2xl border border-[var(--color-border)] inline-flex gap-1">
              <button
                type="button"
                onClick={() => setChartType("area")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartType === "area"
                    ? "bg-white text-indigo-600 shadow-2xs"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
                }`}
              >
                Curva Suave
              </button>
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  chartType === "bar"
                    ? "bg-white text-indigo-600 shadow-2xs"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)]"
                }`}
              >
                Colunas 3D
              </button>
            </div>
          </div>
        </div>

        {/* ÁREA DO GRÁFICO SVG VETORIAL */}
        <div className="relative w-full overflow-x-auto pt-2 pb-2 select-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-72 min-w-[650px] overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="metricGlowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={currentMetricCard.strokeColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={currentMetricCard.strokeColor} stopOpacity="0.0" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid Horizontal + Eixo Y */}
            {yTicks.map((tick, idx) => (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={tick.y}
                  x2={svgWidth - paddingRight}
                  y2={tick.y}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 12}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="fill-[var(--color-text-subtle)] font-mono text-[11px] font-bold"
                >
                  {fmtShortVal(tick.value)}
                </text>
              </g>
            ))}

            {chartType === "area" && (
              <>
                <path
                  d={prevLineD}
                  fill="none"
                  stroke="var(--color-border-strong)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />

                <path d={areaD} fill="url(#metricGlowGradient)" />

                <path
                  d={lineD}
                  fill="none"
                  stroke={currentMetricCard.strokeColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  filter="url(#neonGlow)"
                />

                {points.map((pt, i) => {
                  const isHovered = hoveredPointIndex === i;
                  return (
                    <g
                      key={i}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    >
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={paddingTop}
                          x2={pt.x}
                          y2={paddingTop + chartAreaHeight}
                          stroke={currentMetricCard.strokeColor}
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          opacity="0.7"
                        />
                      )}

                      {isHovered && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={10}
                          fill={currentMetricCard.strokeColor}
                          fillOpacity="0.25"
                        />
                      )}

                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 4}
                        fill="#ffffff"
                        stroke={currentMetricCard.strokeColor}
                        strokeWidth="3"
                        className="transition-all duration-200"
                      />

                      <text
                        x={pt.x}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        className={`text-[11px] font-bold ${
                          isHovered ? "fill-indigo-600 font-black text-xs" : "fill-[var(--color-text-subtle)]"
                        }`}
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </>
            )}

            {chartType === "bar" && (
              <g>
                {points.map((pt, i) => {
                  const isHovered = hoveredPointIndex === i;
                  const barWidth = Math.max(Math.min(48, chartAreaWidth / points.length - 12), 16);
                  const barX = pt.x - barWidth / 2;
                  const barHeight = paddingTop + chartAreaHeight - pt.y;

                  return (
                    <g
                      key={i}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    >
                      <rect
                        x={barX}
                        y={pt.y}
                        width={barWidth}
                        height={barHeight}
                        rx={8}
                        fill={currentMetricCard.strokeColor}
                        fillOpacity={isHovered ? "1.0" : "0.75"}
                        className="transition-all duration-200"
                      />
                      <text
                        x={pt.x}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        className={`text-[11px] font-bold ${
                          isHovered ? "fill-indigo-600 font-black text-xs" : "fill-[var(--color-text-subtle)]"
                        }`}
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </svg>

          {/* INSPECTOR CARD FLUTUANTE */}
          {hoveredPointIndex !== null && (
            <div
              style={{
                left: `${(points[hoveredPointIndex].x / svgWidth) * 100}%`,
                top: `${(points[hoveredPointIndex].y / svgHeight) * 100 - 45}px`,
              }}
              className="absolute -translate-x-1/2 bg-[var(--color-navy)]/95 backdrop-blur-md text-white text-xs font-bold p-3.5 rounded-2xl shadow-2xl border border-indigo-500/40 pointer-events-none z-20 animate-fadeIn min-w-[180px]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <span className="text-[11px] font-extrabold text-indigo-300 uppercase">
                  {points[hoveredPointIndex].label}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                  +{deltas.mrrPercent}%
                </span>
              </div>
              <p className="text-base font-black text-white">
                {activeMetric === "mrr" || activeMetric === "arr"
                  ? fmtCurrency(points[hoveredPointIndex].val)
                  : Math.round(points[hoveredPointIndex].val)}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-1">
                <span>{comparisonRefText}:</span>
                <span className="text-slate-300">
                  {activeMetric === "mrr" || activeMetric === "arr"
                    ? fmtCurrency(points[hoveredPointIndex].prevVal)
                    : Math.round(points[hoveredPointIndex].prevVal)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* LEGENDA DE COMPARAÇÃO COM LINK DE AVISO PARA RELATÓRIOS MULTIANUAIS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--color-border)] text-xs">
          <div className="flex items-center gap-5 flex-wrap">
            <span className="flex items-center gap-2">
              <span style={{ backgroundColor: currentMetricCard.strokeColor }} className="w-3 h-3 rounded-full shadow-2xs" />
              <strong className="text-[var(--color-text-heading)] font-bold">Período Atual (2026)</strong>
            </span>

            <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <span className="w-3 h-0.5 bg-[var(--color-border-strong)] border-dashed border-t border-slate-400" />
              <span>{comparisonRefText}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Eixo X adaptado ({labels.join(", ")})
            </span>

            <Link
              href="/admin/relatorios"
              className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold hover:underline flex items-center gap-1"
            >
              <span>Relatórios Plurianuais (24M+)</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* SEÇÃO DUPLA: STREAM DE ATIVIDADES RECENTES & CENTRAL DE OPERAÇÕES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stream de Atividades Recentes */}
        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-extrabold text-[var(--color-text-heading)]">
                Feed de Atividades Recentes do SaaS
              </h2>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              TEMPO REAL
            </span>
          </div>

          <div className="space-y-4">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-3.5 p-3 rounded-2xl bg-[var(--color-bg-subtle)]/60 border border-[var(--color-border)]/50 hover:bg-slate-50 transition-colors">
                <div className="p-2 rounded-xl bg-white border border-[var(--color-border)] shadow-2xs shrink-0 mt-0.5">
                  {act.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[var(--color-text-heading)] truncate">{act.title}</p>
                    <span className="text-[10px] text-[var(--color-text-subtle)] shrink-0">{act.time}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{act.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Central de Operações Rápidas do Super Admin */}
        <div className="bg-white rounded-3xl border border-[var(--color-border)] p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-extrabold text-[var(--color-text-heading)]">
                Central de Ações Rápidas
              </h2>
            </div>
            <span className="text-[10px] text-[var(--color-text-subtle)] font-bold">ATALHOS SG</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/selecionar-empresa"
              className="p-4 rounded-2xl border border-[var(--color-border)] hover:border-amber-500/40 hover:bg-amber-50/40 transition-all group block shadow-2xs col-span-2 sm:col-span-1"
            >
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 w-fit mb-2 group-hover:scale-110 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-[var(--color-text-heading)] group-hover:text-amber-600 transition-colors">
                Selecionar Ambiente
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Alternar e acessar o painel de qualquer empresa.</p>
            </Link>

            <Link
              href="/admin/companies"
              className="p-4 rounded-2xl border border-[var(--color-border)] hover:border-indigo-500/40 hover:bg-indigo-50/40 transition-all group block shadow-2xs"
            >
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 w-fit mb-2 group-hover:scale-110 transition-transform">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-[var(--color-text-heading)] group-hover:text-indigo-600 transition-colors">
                Empresas SaaS
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Gerenciar cadastros e acesso aos painéis.</p>
            </Link>

            <Link
              href="/admin/financeiro"
              className="p-4 rounded-2xl border border-[var(--color-border)] hover:border-emerald-500/40 hover:bg-emerald-50/40 transition-all group block shadow-2xs"
            >
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 w-fit mb-2 group-hover:scale-110 transition-transform">
                <DollarSign className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-[var(--color-text-heading)] group-hover:text-emerald-600 transition-colors">
                Financeiro & Stripe
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Sincronizar planos e verificar cobranças.</p>
            </Link>

            <Link
              href="/admin/modulos"
              className="p-4 rounded-2xl border border-[var(--color-border)] hover:border-violet-500/40 hover:bg-violet-50/40 transition-all group block shadow-2xs"
            >
              <div className="p-2 rounded-xl bg-violet-50 text-violet-600 w-fit mb-2 group-hover:scale-110 transition-transform">
                <Tag className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-[var(--color-text-heading)] group-hover:text-violet-600 transition-colors">
                Módulos Extras
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Conceder e revogar licenças dinâmicas.</p>
            </Link>

            <Link
              href="/admin/infraestrutura"
              className="p-4 rounded-2xl border border-[var(--color-border)] hover:border-sky-500/40 hover:bg-sky-50/40 transition-all group block shadow-2xs"
            >
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 w-fit mb-2 group-hover:scale-110 transition-transform">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-extrabold text-[var(--color-text-heading)] group-hover:text-sky-600 transition-colors">
                Infraestrutura & Saúde
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Monitor de latência e status dos serviços.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
