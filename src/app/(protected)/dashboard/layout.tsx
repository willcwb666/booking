import Link from "next/link";
import React from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserCompanies } from "@/server/queries/companies";
import { logoutAction } from "@/server/actions/auth";
import { DashboardNav } from "./dashboard-nav";

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

const AlertCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isEmailUnverified = session?.user && !session?.user?.emailVerified;

  const memberships = session ? await getUserCompanies(session.user.id) : [];
  const companies = memberships
    .filter((m) => m.company.isActive)
    .map((m) => ({ name: m.company.name, slug: m.company.slug }));

  return (
    <div className="flex h-screen bg-white text-[#425466] font-sans overflow-hidden selection:bg-[#635bff]/30 selection:text-[#0a2540]">

      {/* ── Sidebar ── */}
      <aside className="relative z-20 w-[260px] flex flex-col bg-[#f6f9fc] border-r border-[#e3e8ee]">
        <div className="h-16 flex items-center px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-[17px] font-bold tracking-tight text-[#0a2540]">
              agendei<span className="text-[#635bff]">.</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
          <DashboardNav companies={companies} />
        </div>

        <div className="p-4 bg-[#f6f9fc] border-t border-[#e3e8ee]">
          <div className="flex items-center gap-3 p-2">
            <img
              src={session?.user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session?.user?.name ?? "U")}`}
              alt=""
              className="w-8 h-8 rounded-full border border-[#e3e8ee]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#0a2540] truncate">{session?.user?.name || "Usuário"}</p>
              <p className="text-[12px] font-medium text-[#697386] truncate">{session?.user?.email || ""}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sair da conta"
                title="Sair"
                className="text-[#697386] hover:text-[#0a2540] transition-colors p-1"
              >
                <LogoutIcon />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden bg-white">

        {/* Email Verification Banner */}
        {isEmailUnverified && (
          <div className="w-full bg-[#fff4e5] border-b border-[#ffe8cc] px-8 py-2.5 flex items-center gap-2 text-[#b05d00] text-[13px] font-bold">
            <AlertCircleIcon />
            <span>Verifique seu e-mail para ativar todas as funcionalidades.</span>
          </div>
        )}

        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-[#e3e8ee] bg-white">
          <div className="flex items-center gap-4">
            <h1 className="text-[16px] font-bold text-[#0a2540]">Visão Geral</h1>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/empresas"
              className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#f6f9fc] text-[14px] font-semibold text-[#425466] hover:text-[#0a2540] transition-colors"
            >
              <SearchIcon className="w-4 h-4" />
              Encontrar empresas
            </Link>
            <Link
              href="/orcamentos"
              className="px-4 py-1.5 bg-[#0a2540] text-white rounded-full text-[14px] font-bold hover:bg-[#425466] transition-colors shadow-[0_2px_5px_rgba(0,0,0,0.1)]"
            >
              Meus orçamentos
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="w-[90%] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
