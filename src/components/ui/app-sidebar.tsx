"use client";

import React from "react";
import Link from "next/link";
import { useCompany } from "@/lib/company-context";
import { logoutAction } from "@/server/actions/auth";
import { NavSidebar, type NavGroup } from "@/components/ui/nav-sidebar";
import {
  Activity,
  ArrowRightLeft,
  Award,
  BarChart2,
  Calendar,
  CalendarRange,
  Clock,
  CreditCard,
  Gift,
  Globe,
  LayoutDashboard,
  LogOut,
  Package,
  Percent,
  Plus,
  PlusCircle,
  Scale,
  Scissors,
  ShoppingCart,
  Settings,
  Star,
  Tag,
  User,
  UserCheck,
  UserCog,
  Users,
  RotateCcw,
  Zap,
} from "./icons";

const ICON = "h-4 w-4 shrink-0";

export function AppSidebar({
  userName,
  multiCompany = false,
  licensedModules = [],
}: {
  userName: string;
  multiCompany?: boolean;
  licensedModules?: string[];
}) {
  const company = useCompany();
  const base = `/${company.slug}`;

  const isLicensed = (code: string) => licensedModules.includes(code);

  /**
   * Agrupamento por PERGUNTA do operador, não por entidade do sistema.
   * Quem abre o painel às 8h quer "o que tenho hoje", não "módulo de agenda".
   *
   * Também desfeitos aqui: rótulos com jargão entre parênteses ("Frente de
   * Caixa (POS)", "Clientes (CRM 360°)") e três destinos diferentes usando o
   * mesmo ícone de Users — se dois itens têm o mesmo ícone, o ícone não está
   * ajudando ninguém.
   */
  const groups: NavGroup[] = [
    {
      label: "Hoje",
      items: [
        {
          href: `${base}/dashboard`,
          label: "Visão geral",
          icon: <LayoutDashboard className={ICON} />,
          keywords: "dashboard home início",
        },
        {
          href: `${base}/schedule`,
          label: "Agenda",
          icon: <CalendarRange className={ICON} />,
          keywords: "calendário calendario dia semana",
        },
        {
          href: `${base}/agendamentos`,
          label: "Agendamentos",
          icon: <Calendar className={ICON} />,
          keywords: "reservas bookings lista",
        },
        {
          href: `${base}/pos`,
          label: "Frente de caixa",
          icon: <CreditCard className={ICON} />,
          keywords: "pos venda comanda caixa pdv",
        },
        ...(isLicensed("waitlist")
          ? [
              {
                href: `${base}/waitlist`,
                label: "Lista de espera",
                icon: <Clock className={ICON} />,
                keywords: "fila espera",
              },
            ]
          : []),
      ],
    },
    {
      label: "Clientes",
      items: [
        {
          href: `${base}/clientes`,
          label: "Clientes",
          icon: <Users className={ICON} />,
          keywords: "crm cadastro histórico historico",
        },
        {
          href: `${base}/meus-agendamentos`,
          label: "Portal do cliente",
          icon: <UserCheck className={ICON} />,
          keywords: "área do cliente area",
        },
        {
          href: `${base}/avaliacoes`,
          label: "Avaliações",
          icon: <Star className={ICON} />,
          keywords: "reviews notas feedback",
        },
      ],
    },
    {
      label: "Catálogo",
      items: [
        {
          href: `${base}/servicos`,
          label: "Serviços",
          icon: <Scissors className={ICON} />,
          keywords: "preços precos procedimentos",
        },
        {
          href: `${base}/produtos`,
          label: "Produtos e estoque",
          icon: <Package className={ICON} />,
          keywords: "inventário inventario",
        },
        {
          href: `${base}/reposicao`,
          label: "Reposição",
          // ShoppingCart, não Package: Package já é Produtos e estoque, e o
          // ponto desta tela é a COMPRA, não o inventário.
          icon: <ShoppingCart className={ICON} />,
          keywords: "comprar fornecedor pedido estoque baixo giro",
        },
        {
          href: `${base}/agendas`,
          label: "Grades de horário",
          icon: <Clock className={ICON} />,
          keywords: "agendas disponibilidade slots turnos",
        },
        {
          href: `${base}/booking`,
          label: "Página de agendamento",
          icon: <Globe className={ICON} />,
          keywords: "booking link público publico site",
        },
      ],
    },
    {
      label: "Equipe",
      items: [
        {
          href: `${base}/profissionais`,
          label: "Profissionais",
          icon: <UserCog className={ICON} />,
          keywords: "barbeiros staff atendentes",
        },
        {
          href: `${base}/equipe`,
          label: "Acessos ao painel",
          icon: <Users className={ICON} />,
          keywords: "equipe usuários usuarios permissões permissoes convites",
        },
        {
          href: `${base}/cargos`,
          label: "Cargos",
          icon: <Award className={ICON} />,
          keywords: "especialidades funções funcoes",
        },
        {
          href: `${base}/comissoes`,
          label: "Comissões",
          icon: <Scale className={ICON} />,
          keywords: "repasse pagamento equipe",
        },
        ...(isLicensed("split_pagamentos")
          ? [
              {
                href: `${base}/split`,
                label: "Split de pagamentos",
                icon: <ArrowRightLeft className={ICON} />,
                keywords: "divisão divisao repasse automático",
              },
            ]
          : []),
      ],
    },
    {
      label: "Resultados",
      items: [
        {
          href: `${base}/relatorios`,
          label: "Relatórios",
          icon: <BarChart2 className={ICON} />,
          keywords: "dre faturamento financeiro",
        },
      ],
    },
    {
      // Recolhido por padrão: são recursos opcionais, consultados de vez em
      // quando. Deixá-los abertos empurra o que é diário para fora da tela.
      label: "Crescimento",
      defaultCollapsed: true,
      items: [
        {
          href: `${base}/modulos`,
          label: "Módulos",
          icon: <Zap className={ICON} />,
          keywords: "add-ons extras contratar",
        },
        ...(isLicensed("promocoes")
          ? [
              {
                href: `${base}/promocoes`,
                label: "Promoções",
                icon: <Tag className={ICON} />,
                keywords: "campanha desconto oferta",
              },
              {
                href: `${base}/horarios-ociosos`,
                label: "Horários ociosos",
                // Percent, não Clock: Clock já é Lista de espera E Grades de
                // horário. Ícone repetido não ajuda ninguém a achar nada.
                icon: <Percent className={ICON} />,
                keywords: "happy hour desconto vazio ocupacao ocupação",
              },
              {
                href: `${base}/resgate`,
                label: "Resgate de clientes",
                // RotateCcw = voltar. Users ja e Clientes, e o proprio arquivo
                // diz que icone repetido nao ajuda ninguem.
                icon: <RotateCcw className={ICON} />,
                keywords: "win-back inativo retorno ciclo sumiu",
              },
            ]
          : []),
        ...(isLicensed("fidelidade")
          ? [
              {
                href: `${base}/fidelidade`,
                label: "Fidelidade",
                icon: <Award className={ICON} />,
                keywords: "pontos cashback",
              },
            ]
          : []),
        ...(isLicensed("clube_assinaturas")
          ? [
              {
                href: `${base}/assinaturas`,
                label: "Clube de assinaturas",
                icon: <CreditCard className={ICON} />,
                keywords: "recorrência recorrencia mensalidade",
              },
            ]
          : []),
        ...(isLicensed("gift_cards")
          ? [
              {
                href: `${base}/gift-cards`,
                label: "Vales-presente",
                icon: <Gift className={ICON} />,
                keywords: "gift card presente",
              },
            ]
          : []),
        ...(isLicensed("smart_rebooking")
          ? [
              {
                href: `${base}/rebooking`,
                label: "Retorno automático",
                icon: <Activity className={ICON} />,
                keywords: "rebooking ia recompra",
              },
            ]
          : []),
      ],
    },
    {
      label: "Conta",
      defaultCollapsed: true,
      items: [
        {
          href: `${base}/configuracoes`,
          label: "Configurações",
          icon: <Settings className={ICON} />,
          keywords: "empresa pagamento plano",
        },
        {
          href: `${base}/perfil`,
          label: "Meu perfil",
          icon: <User className={ICON} />,
          keywords: "senha notificações notificacoes",
        },
        {
          // Sem `base`: a rota é da pessoa, não da empresa. É a fronteira do
          // modo pessoal — os agendamentos dela em TODAS as empresas ficam
          // aqui, e nenhum deles pertence à empresa que está aberta agora.
          href: `/minha-conta`,
          label: "Minha conta",
          icon: <ArrowRightLeft className={ICON} />,
          keywords: "meus agendamentos dados pessoais outras empresas cliente",
        },
        {
          href: `${base}/changelog`,
          label: "Novidades",
          icon: <Star className={ICON} />,
          keywords: "changelog atualizações atualizacoes",
        },
        ...(multiCompany
          ? [
              {
                href: "/onboarding",
                label: "Criar empresa",
                icon: <PlusCircle className={ICON} />,
                keywords: "nova empresa filial",
              },
            ]
          : []),
      ],
    },
  ];

  const brand = (
    <div className="space-y-2">
      <Link
        href="/selecionar-empresa"
        title="Trocar de empresa"
        className="flex items-center gap-2.5 p-2 rounded-[var(--radius-control)] hover:bg-[var(--color-bg-hover)] transition-colors group"
      >
        <span className="w-8 h-8 rounded-[var(--radius-control)] bg-[var(--color-primary)] text-[var(--color-primary-contrast)] font-semibold flex items-center justify-center shrink-0 overflow-hidden text-xs">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            company.name[0].toUpperCase()
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span
            className="block font-semibold text-[var(--color-text-heading)] truncate"
            style={{ fontSize: "var(--text-sm)" }}
          >
            {company.name}
          </span>
          <span
            className="block text-[var(--color-text-muted)] truncate"
            style={{ fontSize: "var(--text-xs)" }}
          >
            {company.planDisplayName}
          </span>
        </span>
        <ArrowRightLeft className="h-3.5 w-3.5 text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)] transition-colors shrink-0" />
      </Link>

      {/*
        Ação rápida. Antes era "+ Agendamento" apontando para a LISTA de
        agendamentos — um botão de criar que não criava nada. Enquanto não
        existe um formulário de agendamento no painel, o atalho leva ao lugar
        onde o operador de fato começa o dia.
      */}
      <Link href={`${base}/schedule`} className="btn btn-primary btn-tactile w-full">
        <Plus className="w-4 h-4 shrink-0" />
        <span>Abrir agenda de hoje</span>
      </Link>
    </div>
  );

  const footer = (
    <div className="space-y-1">
      <div className="flex items-center gap-2.5 px-2 py-1">
        <span className="w-7 h-7 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text)] font-semibold flex items-center justify-center text-xs shrink-0">
          {userName ? userName[0].toUpperCase() : "U"}
        </span>
        <span
          className="font-medium text-[var(--color-text)] truncate"
          style={{ fontSize: "var(--text-sm)" }}
        >
          {userName}
        </span>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="nav-link w-full hover:!text-[var(--color-danger)]">
          <LogOut className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
          <span>Sair</span>
        </button>
      </form>
    </div>
  );

  return (
    <NavSidebar
      brand={brand}
      groups={groups}
      footer={footer}
      mobileTitle={company.name}
    />
  );
}
