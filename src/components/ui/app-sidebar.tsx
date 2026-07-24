"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { logoutAction } from "@/server/actions/auth";
import { Sidebar, SidebarBody, SidebarLink, Links } from "@/components/ui/sidebar";
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
} from "./icons";

export function AppSidebar({
  userName,
  multiCompany = false,
}: {
  userName: string;
  multiCompany?: boolean;
}) {
  const company = useCompany();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navItems = [
    {
      href: `/${company.slug}/dashboard`,
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/servicos`,
      label: "Serviços",
      icon: <Scissors className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/agendas`,
      label: "Agendas",
      icon: <CalendarRange className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/profissionais`,
      label: "Profissionais",
      icon: <Users className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/schedule`,
      label: "Calendário",
      icon: <Calendar className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/agendamentos`,
      label: "Agendamentos",
      icon: <ClipboardList className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/waitlist`,
      label: "Lista de espera",
      icon: <UserCheck className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/avaliacoes`,
      label: "Avaliações",
      icon: <Star className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/promocoes`,
      label: "Promoções",
      icon: <Tag className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/fidelidade`,
      label: "Fidelidade & Pontos",
      icon: <Award className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/equipe`,
      label: "Equipe",
      icon: <Users className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/booking`,
      label: "Booking",
      icon: <Globe className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/configuracoes`,
      label: "Configurações",
      icon: <Settings className="h-4 w-4 shrink-0" />,
    },
    {
      href: `/${company.slug}/perfil`,
      label: "Meu perfil",
      icon: <User className="h-4 w-4 shrink-0" />,
    },
    ...(multiCompany
      ? [
          {
            href: "/onboarding",
            label: "Criar empresa",
            icon: <PlusCircle className="h-4 w-4 shrink-0" />,
          },
        ]
      : []),
  ];

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-6">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {/* Identidade da Empresa (Estilo Stripe Card) */}
          <Link
            href="/selecionar-empresa"
            title="Trocar de empresa / Selecionar ambiente"
            className="flex items-center gap-3 p-2 rounded-2xl bg-white hover:bg-slate-100/80 transition-all border border-slate-200/80 shadow-2xs group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#635bff] text-white font-extrabold flex items-center justify-center shrink-0 overflow-hidden text-xs shadow-xs">
              {company.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                company.name[0].toUpperCase()
              )}
            </div>

            {open && (
              <div className="min-w-0 flex-1 text-left animate-fadeIn">
                <p className="text-xs font-bold text-slate-900 truncate">{company.name}</p>
                <span className="text-[10px] text-indigo-600 font-semibold block">
                  {company.planDisplayName}
                </span>
              </div>
            )}

            {open && (
              <ArrowRightLeft className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
            )}
          </Link>

          {/* Links de Navegação */}
          <div className="mt-6 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <SidebarLink
                  key={item.href}
                  link={item as Links}
                  className={
                    isActive
                      ? "bg-indigo-50/90 text-indigo-600 font-semibold border-r-2 border-indigo-600 shadow-2xs"
                      : ""
                  }
                />
              );
            })}
          </div>
        </div>

        {/* Rodapé: Perfil do Usuário e Botão Sair */}
        <div className="border-t border-slate-200/80 pt-4 space-y-2">
          <div className="flex items-center gap-3 px-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
              {userName ? userName[0].toUpperCase() : "U"}
            </div>
            {open && (
              <span className="text-xs font-semibold text-slate-700 truncate text-left animate-fadeIn">
                {userName}
              </span>
            )}
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-red-500" />
              {open && <span>Sair da conta</span>}
            </button>
          </form>
        </div>
      </SidebarBody>
    </Sidebar>
  );
}
