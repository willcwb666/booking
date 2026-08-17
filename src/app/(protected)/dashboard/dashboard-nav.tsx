"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
);

const FileTextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

const BriefcaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

type CompanyLink = { name: string; slug: string };

function NavLink({
  href,
  icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={isActive ? "nav-link nav-link-active" : "nav-link"}
    >
      <div className={isActive ? "text-primary" : "text-text-muted"}>{icon}</div>
      {label}
    </Link>
  );
}

export function DashboardNav({ companies }: { companies: CompanyLink[] }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <nav className="space-y-0.5" aria-label="Navegação principal">
        <NavLink href="/dashboard" icon={<HomeIcon />} label="Início" isActive={pathname === "/dashboard"} />
        <NavLink href="/orcamentos" icon={<FileTextIcon />} label="Meus orçamentos" isActive={active("/orcamentos")} />
        <NavLink href="/empresas" icon={<SearchIcon />} label="Encontrar empresas" isActive={active("/empresas")} />
      </nav>

      <div className="mt-8">
        <p className="px-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Minhas empresas
        </p>
        <nav className="space-y-0.5" aria-label="Minhas empresas">
          {companies.map((c) => (
            <NavLink
              key={c.slug}
              href={`/${c.slug}/dashboard`}
              icon={<BriefcaseIcon />}
              label={c.name}
              isActive={active(`/${c.slug}`)}
            />
          ))}
          {companies.length === 0 && (
            <NavLink
              href="/onboarding"
              icon={<PlusIcon />}
              label="Criar minha empresa"
              isActive={active("/onboarding")}
            />
          )}
        </nav>
      </div>
    </>
  );
}
