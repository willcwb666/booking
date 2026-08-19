"use client";

import React, { useState } from "react";
import Link from "next/link";
import { type SystemModule } from "@/server/actions/admin-modules";
import { ModuleIcon } from "@/components/ui/module-icon";
import {
  Printer,
  Search,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  DollarSign,
  Tag,
  Award,
  CreditCard,
  Zap,
  MapPin,
  FileText,
  Building2,
  Layers,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
} from "@/components/ui/icons";

type Props = {
  modules: SystemModule[];
};

const CATEGORY_MAP: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  ALL: {
    label: "Todos os Add-ons",
    bg: "bg-[var(--color-bg-subtle)]",
    text: "text-[var(--color-text-heading)]",
    border: "border-[var(--color-border)]",
    icon: Layers,
  },
  GROWTH: {
    label: "Crescimento & Vendas",
    bg: "bg-[var(--color-success-light)]",
    text: "text-[var(--color-success)]",
    border: "border-[var(--color-success-border)]",
    icon: Award,
  },
  OPERATIONS: {
    label: "Operações & Produtividade",
    bg: "bg-[var(--color-primary-light)]",
    text: "text-[var(--color-primary)]",
    border: "border-[var(--color-primary-muted)]",
    icon: Zap,
  },
  FINANCE: {
    label: "Financeiro & Comissões",
    bg: "bg-[var(--color-warning-light)]",
    text: "text-[var(--color-warning)]",
    border: "border-[var(--color-warning-border)]",
    icon: DollarSign,
  },
  AI: {
    label: "Inteligência Artificial",
    bg: "bg-[var(--color-primary-light)]",
    text: "text-[var(--color-primary)]",
    border: "border-[var(--color-primary-muted)]",
    icon: Sparkles,
  },
};

const MODULE_BENEFITS: Record<string, string[]> = {
  promocoes: [
    "Cupons com desconto percentual ou valor fixo",
    "Limite de usos e data de validade programada",
    "Aumento de 28% no ticket médio em datas promocionais",
  ],
  fidelidade: [
    "Pontuação automática a cada real gasto no atendimento",
    "Resgate de cortesias e descontos no checkout",
    "Aumento de 42% na taxa de recompra e retenção",
  ],
  waitlist: [
    "Fila de espera inteligente para horários disputados",
    "Notificação automática no WhatsApp em desistências",
    "Zero cadeiras ociosas em dias de pico",
  ],
  clube_assinaturas: [
    "Criação de planos mensais de atendimento recorrente",
    "Cobrança automática no cartão ou PIX recorrente",
    "Receita garantida no primeiro dia do mês",
  ],
  gift_cards: [
    "Venda de cartões presente digitais personalizados",
    "Geração de receita antecipada antes da prestação do serviço",
    "Saldo fracionável utilizado no checkout online",
  ],
  comanda_pos: [
    "Adição de pomadas, shampoos e produtos na comanda",
    "Baixa automática no controle de estoque",
    "Fechamento unificado de serviço + produto no balcão",
  ],
  smart_rebooking: [
    "Identificação do ciclo médio de retorno do cliente",
    "Disparo autônomo de lembretes no momento exato da volta",
    "Recuperação de clientes inativos há mais de 30 dias",
  ],
  ai_booking_copilot: [
    "Agendamento por comando de voz e texto com NLP",
    "Atendimento conversacional inteligente 24 horas por dia",
    "Redução de 80% do tempo gasto em WhatsApp pela recepção",
  ],
  split_pagamentos: [
    "Cálculo automático de comissão por profissional e serviço",
    "Relatório de repasses líquidos para fechamento de quinzena",
    "Eliminação de erros e disputas financeiras na equipe",
  ],
  ghost_slot_buster: [
    "Detecção em tempo real de cancelamentos de última hora",
    "Ofertas relâmpago dinâmicas de 15% a 25% OFF na vitrine",
    "Recuperação imediata de 65% do faturamento de slots perdidos",
  ],
  checkin_geofencing: [
    "Check-in em 1 clique por raio de proximidade GPS (250m)",
    "Janela de horário inteligente estilo DMV Colorado",
    "Painel de recepção atualizado em tempo real quando o cliente chega",
  ],
  vip_experience: [
    "Seleção de modo silencioso/foco para clientes reservados",
    "Escolha de bebida de boas-vindas na recepção",
    "Aviso de pele sensível ou restrições para o profissional",
  ],
  dynamic_return: [
    "Cálculo automático de próxima data de retorno no pós-serviço",
    "Reserva do próximo mês em 1 toque com 10% de desconto",
    "Fidelização imediata no comprovante de atendimento",
  ],
  relatorios_avancados: [
    "DRE detalhado, faturamento líquido e margem de lucro",
    "Análise de LTV (Life Time Value) e taxa de No-Show",
    "Exportação de balanços executivos em PDF e Excel",
  ],
};

export function AddonCatalogClient({ modules }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fmtCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filteredModules = modules.filter((m) => {
    const matchesCategory =
      selectedCategory === "ALL" || m.category === selectedCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalMonthlyPotential = modules.reduce((acc, m) => acc + m.monthlyPrice, 0);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* ── Top Bar & Actions (Oculto no Print) ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <Link
            href="/admin/modulos"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Gerenciador de Licenças</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--color-text-heading)] tracking-tight flex items-center gap-2.5">
            <span>Catálogo Oficial de Add-ons & Módulos</span>
            <span className="text-xs font-bold text-[var(--color-success)] bg-[var(--color-success-light)] border border-[var(--color-success-border)] px-2.5 py-0.5 rounded-full">
              {modules.length} Disponíveis
            </span>
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] font-medium mt-1">
            Apresentação comercial e tabela de valores para demonstração, propostas e expansão de receita.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <Link
            href="/admin/modulos"
            className="btn-tactile flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)] text-[var(--color-text)] text-xs font-extrabold shadow-2xs flex items-center justify-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 text-[var(--color-warning)]" />
            <span>Liberar Licenças</span>
          </Link>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-tactile flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-[var(--color-navy)] hover:bg-[var(--color-navy)] text-white text-xs font-extrabold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / Salvar em PDF</span>
          </button>
        </div>
      </div>

      {/* ── Capa de Impressão (Só aparece no Print) ── */}
      <div className="hidden print:block border-b-2 border-[var(--color-border-strong)] pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[var(--color-text-heading)] tracking-tight">
              Kreator SaaS — Catálogo Oficial de Add-ons & Módulos
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] font-medium mt-0.5">
              Proposta Comercial & Especificação Técnica de Funcionalidades Adicionais
            </p>
          </div>
          <div className="text-right text-xs text-[var(--color-text-muted)] font-mono">
            <p className="font-bold text-[var(--color-text-heading)]">Emissão: {new Date().toLocaleDateString("pt-BR")}</p>
            <p>Versão: v3.5.0 Commercial Edition</p>
          </div>
        </div>
      </div>

      {/* ── Cards de Indicadores Executivos ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
        <div className="p-4 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)]/90 shadow-2xs">
          <span className="text-[11px] font-bold text-[var(--color-text-muted)] block">Total de Add-ons</span>
          <p className="text-xl font-black text-[var(--color-text-heading)] mt-1">{modules.length} Módulos</p>
          <span className="text-[10px] text-[var(--color-success)] font-bold mt-0.5 block">100% Modulares & Plugáveis</span>
        </div>

        <div className="p-4 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)]/90 shadow-2xs">
          <span className="text-[11px] font-bold text-[var(--color-text-muted)] block">Categorias Comerciais</span>
          <p className="text-xl font-black text-[var(--color-text-heading)] mt-1">4 Pilares</p>
          <span className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5 block">Vendas, Ops, Fin, IA</span>
        </div>

        <div className="p-4 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)]/90 shadow-2xs">
          <span className="text-[11px] font-bold text-[var(--color-text-muted)] block">Potencial por Estabelecimento</span>
          <p className="text-xl font-black text-[var(--color-success)] mt-1">{fmtCurrency(totalMonthlyPotential)}<span className="text-xs text-[var(--color-text-muted)] font-normal">/mês</span></p>
          <span className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5 block">Se contratado pacote full</span>
        </div>

        <div className="p-4 rounded-3xl bg-[var(--color-bg)] border border-[var(--color-border)]/90 shadow-2xs">
          <span className="text-[11px] font-bold text-[var(--color-text-muted)] block">Modelo de Contratação</span>
          <p className="text-xl font-black text-[var(--color-text-heading)] mt-1">Recorrente & Setup</p>
          <span className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5 block">Trial gratuito de 30 dias</span>
        </div>
      </div>

      {/* ── Filtros e Busca (Oculto no Print) ── */}
      <div className="space-y-3 print:hidden">
        {/* Categorias Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {Object.keys(CATEGORY_MAP).map((catKey) => {
            const cat = CATEGORY_MAP[catKey];
            const isSelected = selectedCategory === catKey;
            const CatIcon = cat.icon;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? "bg-[var(--color-navy)] text-white shadow-xs"
                    : "bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)]/90 hover:bg-[var(--color-bg-subtle)]"
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input de Busca */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--color-text-subtle)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar add-on por nome, benefício ou tecnologia..."
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)]/90 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--color-text-heading)] placeholder:text-[var(--color-text-subtle)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-border-strong)]/10 focus:border-[var(--color-border-strong)] transition-all"
          />
        </div>
      </div>

      {/* ── Grade de Cards dos Add-ons ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-3">
        {filteredModules.map((m) => {
          const cat = CATEGORY_MAP[m.category] || CATEGORY_MAP.GROWTH;
          const benefits = MODULE_BENEFITS[m.code] || [
            "Ativação instantânea no painel sem necessidade de código",
            "Relatórios e métricas de desempenho dedicadas",
            "Treinamento e suporte operacional incluído",
          ];

          return (
            <div
              key={m.id}
              className="bg-[var(--color-bg)] rounded-3xl border border-[var(--color-border)]/90 p-5 sm:p-6 space-y-4 shadow-xs card-tactile flex flex-col justify-between print:rounded-2xl print:p-4 print:border-[var(--color-border)] print:shadow-none"
            >
              <div className="space-y-3.5">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[var(--color-navy)] text-white flex items-center justify-center shadow-xs shrink-0 print:bg-[var(--color-bg-subtle)] print:text-[var(--color-text-heading)] print:border print:border-[var(--color-border)]">
                      <ModuleIcon name={m.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[var(--color-text-heading)] leading-tight">
                        {m.name}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 border ${cat.bg} ${cat.text} ${cat.border}`}>
                        {cat.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Descrição Comercial */}
                <p className="text-xs text-[var(--color-text-muted)] font-medium leading-relaxed">
                  {m.description}
                </p>

                {/* Lista de Benefícios de Negócio */}
                <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
                  <span className="text-[10px] font-extrabold text-[var(--color-text-subtle)] uppercase tracking-wider block">
                    Benefícios de Alto Impacto:
                  </span>
                  {benefits.map((b, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-[var(--color-text)]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)] shrink-0 mt-0.5" />
                      <span className="text-[11px] font-medium leading-tight">{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabela de Preço & Modelo Comercial */}
              <div className="pt-3.5 border-t border-[var(--color-border)] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[var(--color-text-subtle)] block uppercase">
                    Investimento
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-[var(--color-text-heading)]">
                      {m.monthlyPrice > 0 ? fmtCurrency(m.monthlyPrice) : "Sob Consulta"}
                    </span>
                    {m.monthlyPrice > 0 && (
                      <span className="text-[10px] font-bold text-[var(--color-text-muted)]">/mês</span>
                    )}
                  </div>
                  {m.lifetimePrice > 0 && (
                    <span className="text-[10px] text-[var(--color-text-muted)] font-medium block">
                      ou {fmtCurrency(m.lifetimePrice)} vitalício
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-[var(--color-success)] bg-[var(--color-success-light)] border border-[var(--color-success-border)] px-2 py-0.5 rounded-full">
                    30 Dias Grátis
                  </span>
                  <span className="text-[9px] text-[var(--color-text-subtle)] block mt-1 font-mono">
                    Código: mod_{m.code}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Resumo Geral de Preços para Apresentação / Proposta PDF ── */}
      <div className="bg-[var(--color-bg)] rounded-3xl border border-[var(--color-border)]/90 p-6 space-y-4 shadow-xs print:rounded-none print:border-t-2 print:border-[var(--color-border-strong)] print:shadow-none">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--color-text)]" />
            <h2 className="text-sm font-black text-[var(--color-text-heading)]">
              Tabela Resumo de Investimento em Add-ons (Proposta Comercial)
            </h2>
          </div>
          <span className="text-xs font-bold text-[var(--color-text-muted)] font-mono">
            {modules.length} Módulos Catalogados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-subtle)] font-extrabold uppercase text-[10px]">
                <th className="pb-2">Módulo / Add-on</th>
                <th className="pb-2">Categoria</th>
                <th className="pb-2">Mensalidade</th>
                <th className="pb-2">Setup / Vitalício</th>
                <th className="pb-2 text-right">Trial Gratuito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {modules.map((m) => (
                <tr key={m.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <td className="py-2.5 font-black text-[var(--color-text-heading)] flex items-center gap-2">
                    <ModuleIcon name={m.icon} className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    <span>{m.name}</span>
                  </td>
                  <td className="py-2.5 text-[var(--color-text-muted)] font-medium">
                    {CATEGORY_MAP[m.category]?.label || m.category}
                  </td>
                  <td className="py-2.5 font-bold text-[var(--color-text-heading)]">
                    {m.monthlyPrice > 0 ? fmtCurrency(m.monthlyPrice) : "—"}
                  </td>
                  <td className="py-2.5 text-[var(--color-text-muted)] font-mono">
                    {m.lifetimePrice > 0 ? fmtCurrency(m.lifetimePrice) : "Apenas Mensal"}
                  </td>
                  <td className="py-2.5 text-right font-bold text-[var(--color-success)]">
                    30 dias
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--color-border-strong)] font-black text-[var(--color-text-heading)] text-sm">
                <td className="pt-3" colSpan={2}>
                  Pacote Completo (All Add-ons Bundle):
                </td>
                <td className="pt-3 text-[var(--color-success)] font-black text-base">
                  {fmtCurrency(totalMonthlyPotential)}/mês
                </td>
                <td className="pt-3 text-[var(--color-text-muted)] text-xs font-medium" colSpan={2}>
                  Economia de escala em contratações anuais
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
