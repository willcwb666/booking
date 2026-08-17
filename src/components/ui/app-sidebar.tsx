"use client";

import React from "react";
import Link from "next/link";
import { useCompany } from "@/lib/company-context";
import { logoutAction } from "@/server/actions/auth";
import { NavSidebar, type NavGroup } from "@/components/ui/nav-sidebar";
import {
  LayoutDashboard,
  Scissors,
  CalendarRange,
  Users,
  Calendar,
  ClipboardList,
  UserCheck,
  Star,
  Tag,
  Award,
  Globe,
  Settings,
  User,
  PlusCircle,
  LogOut,
  ArrowRightLeft,
  FileText,
  DollarSign,
  CreditCard,
  Bell,
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

  // Helper para verificar se um módulo foi ativado/liberado para esta empresa
  const isLicensed = (code: string) => licensedModules.includes(code);

  const groups: NavGroup[] = [
    {
      label: "Operação",
      items: [
        { href: `${base}/dashboard`, label: "Dashboard", icon: <LayoutDashboard className={ICON} /> },
        { href: `${base}/agendamentos`, label: "Agendamentos", icon: <ClipboardList className={ICON} /> },
        { href: `${base}/comissoes`, label: "Comissões da Equipe", icon: <Award className={ICON} /> },
        { href: `${base}/clientes`, label: "Clientes (CRM 360°)", icon: <Users className={ICON} /> },
        { href: `${base}/relatorios`, label: "Relatórios & DRE", icon: <FileText className={ICON} /> },
        { href: `${base}/meus-agendamentos`, label: "Portal do Cliente", icon: <UserCheck className={ICON} /> },
        { href: `${base}/schedule`, label: "Calendário", icon: <Calendar className={ICON} /> },
        ...(isLicensed("split_pagamentos")
          ? [{ href: `${base}/split`, label: "Split & Comissões", icon: <DollarSign className={ICON} /> }]
          : []),
        ...(isLicensed("waitlist")
          ? [{ href: `${base}/waitlist`, label: "Lista de espera", icon: <UserCheck className={ICON} /> }]
          : []),
        ...(isLicensed("comanda_pos")
          ? [{ href: `${base}/comanda`, label: "Comanda POS", icon: <ClipboardList className={ICON} /> }]
          : []),
      ],
    },
    {
      label: "Catálogo",
      items: [
        { href: `${base}/servicos`, label: "Serviços", icon: <Scissors className={ICON} /> },
        { href: `${base}/cargos`, label: "Cargos & Especialidades", icon: <User className={ICON} /> },
        { href: `${base}/agendas`, label: "Agendas", icon: <CalendarRange className={ICON} /> },
        { href: `${base}/profissionais`, label: "Profissionais", icon: <Users className={ICON} /> },
        { href: `${base}/equipe`, label: "Equipe", icon: <Users className={ICON} /> },
        { href: `${base}/booking`, label: "Booking", icon: <Globe className={ICON} /> },
      ],
    },
    {
      label: "Crescimento & Add-ons",
      items: [
        { href: `${base}/modulos`, label: "Módulos & Add-ons", icon: <Tag className={ICON} /> },
        { href: `${base}/avaliacoes`, label: "Avaliações", icon: <Star className={ICON} /> },
        ...(isLicensed("promocoes")
          ? [{ href: `${base}/promocoes`, label: "Promoções", icon: <Tag className={ICON} /> }]
          : []),
        ...(isLicensed("fidelidade")
          ? [{ href: `${base}/fidelidade`, label: "Fidelidade & Pontos", icon: <Award className={ICON} /> }]
          : []),
        ...(isLicensed("smart_rebooking")
          ? [{ href: `${base}/rebooking`, label: "Smart Rebooking IA", icon: <Bell className={ICON} /> }]
          : []),
        ...(isLicensed("clube_assinaturas")
          ? [{ href: `${base}/assinaturas`, label: "Clube de Assinaturas", icon: <CreditCard className={ICON} /> }]
          : []),
      ],
    },
    {
      label: "Conta",
      items: [
        { href: `${base}/changelog`, label: "Changelog", icon: <Tag className={ICON} /> },
        { href: `${base}/configuracoes`, label: "Configurações", icon: <Settings className={ICON} /> },
        { href: `${base}/perfil`, label: "Meu perfil", icon: <User className={ICON} /> },
        ...(multiCompany
          ? [{ href: "/onboarding", label: "Criar empresa", icon: <PlusCircle className={ICON} /> }]
          : []),
      ],
    },
  ];

  const brand = (
    <div className="space-y-2.5">
      <Link
        href="/selecionar-empresa"
        title="Trocar de empresa / Selecionar ambiente"
        className="flex items-center gap-3 p-2 rounded-2xl bg-[var(--color-bg)] hover:bg-[var(--color-bg-hover)] transition-all border border-[var(--color-border)] shadow-[var(--shadow-xs)] group cursor-pointer"
      >
        <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)] text-white font-extrabold flex items-center justify-center shrink-0 overflow-hidden text-xs shadow-[var(--shadow-xs)]">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
          ) : (
            company.name[0].toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-xs font-bold text-[var(--color-text-heading)] truncate">{company.name}</p>
          <span className="text-[10px] text-[var(--color-primary)] font-semibold block">{company.planDisplayName}</span>
        </div>
        <ArrowRightLeft className="h-3.5 w-3.5 text-[var(--color-text-subtle)] group-hover:text-[var(--color-text)] transition-colors shrink-0" />
      </Link>

      {/* Botão de Ação Rápida - Super Intuitivo */}
      <Link
        href={`${base}/agendamentos`}
        className="w-full py-2.5 px-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98] text-white rounded-xl font-extrabold text-xs shadow-[var(--shadow-primary)] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
      >
        <PlusCircle className="w-4 h-4 shrink-0" />
        <span>+ Agendamento</span>
      </Link>
    </div>
  );

  const footer = (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-2">
        <div className="w-7 h-7 rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text)] font-bold flex items-center justify-center text-xs shrink-0">
          {userName ? userName[0].toUpperCase() : "U"}
        </div>
        <span className="text-xs font-semibold text-[var(--color-text)] truncate text-left">{userName}</span>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-2.5 py-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
          <span>Sair da conta</span>
        </button>
      </form>
    </div>
  );

  return <NavSidebar brand={brand} groups={groups} footer={footer} mobileTitle={company.name} />;
}
