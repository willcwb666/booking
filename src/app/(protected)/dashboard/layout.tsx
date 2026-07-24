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
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="app-sidebar flex flex-col">
        <div className="h-16 flex items-center px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-[17px] font-bold tracking-tight text-[var(--color-navy)]">
              agendei<span className="text-[var(--color-primary)]">.</span>
            </span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
          <DashboardNav companies={companies} />
        </div>

        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 p-2">
            <img
              src={session?.user?.image || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session?.user?.name ?? "U")}`}
              alt=""
              className="w-8 h-8 rounded-full border border-[var(--color-border)]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[var(--color-navy)] truncate">{session?.user?.name || "Usuário"}</p>
              <p className="text-[12px] font-medium text-[var(--color-text-muted)] truncate">{session?.user?.email || ""}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sair da conta"
                title="Sair"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-navy)] transition-colors p-1"
              >
                <LogoutIcon />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="app-main">

        {/* Email Verification Banner */}
        {isEmailUnverified && (
          <div className="alert alert-warning w-full rounded-none border-x-0 border-t-0 px-8">
            <AlertCircleIcon />
            <span>Verifique seu e-mail para ativar todas as funcionalidades.</span>
          </div>
        )}

        {/* Topbar */}
        <header className="app-header">
          <div className="flex items-center gap-4">
            <h1 className="text-[16px] font-bold text-[var(--color-navy)]">Visão Geral</h1>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/empresas"
              className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-md bg-[var(--color-bg-subtle)] text-[14px] font-semibold text-[var(--color-text)] hover:text-[var(--color-navy)] transition-colors"
            >
              <SearchIcon className="w-4 h-4" />
              Encontrar empresas
            </Link>
            <Link
              href="/orcamentos"
              className="btn btn-navy btn-lg !rounded-full !text-[14px]"
            >
              Meus orçamentos
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="page-container scrollbar-hide">
          <div className="page-content">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
