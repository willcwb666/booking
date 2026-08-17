import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserCompanies } from "@/server/queries/companies";
import { logoutAction } from "@/server/actions/auth";

const BUSINESS_LABEL: Record<string, string> = {
  HOME_CLEANING: "Limpeza residencial",
  PET_GROOMER: "Pet groomer",
  CAR_WASH: "Lava-rápido",
  POOL_CLEANING: "Limpeza de piscinas",
  LAWN_CARE: "Jardinagem",
  BARBER: "Barbearia",
  HAIR_SALON: "Salão de beleza",
  PHOTOGRAPHER: "Fotografia",
  OTHER: "Outro",
};

export default async function SelecionarEmpresaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [memberships, dbUser] = await Promise.all([
    getUserCompanies(session.user.id),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { allowMultiCompany: true },
    }),
  ]);

  const companies = memberships
    .filter((m) => m.company.isActive)
    .map((m) => m.company);

  // Somente o super admin da plataforma vê o atalho para o painel /admin
  const isSuperAdmin = session.user.role === "admin";


  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center space-y-1">
        <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">Olá, {session.user.name}</p>
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-heading)] tracking-tight">Selecione o ambiente</h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">Escolha a empresa que deseja gerenciar ou acesse a administração.</p>
      </div>

      <div className="w-full max-w-md space-y-3">
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-4 bg-white rounded-2xl border-2 border-[var(--color-primary)]/40 p-5 hover:border-[var(--color-primary)] hover:shadow-md transition-all group shadow-xs"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[var(--color-primary-light)] text-[var(--color-primary)]" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold text-[var(--color-text-heading)] truncate">Plataforma Super Admin</p>
                <span className="text-[10px] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-black px-2 py-0.5 rounded-full uppercase">Global</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Painel de controle executivo da plataforma SaaS</p>
            </div>
            <span className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-primary)] transition-colors font-bold" aria-hidden="true">→</span>
          </Link>
        )}

        {companies.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-6 bg-white rounded-2xl border border-[var(--color-border)] shadow-2xs">
            Nenhuma empresa encontrada no seu usuário.
          </p>
        )}

        {companies.map((c) => (
          <Link
            key={c.id}
            href={`/${c.slug}/dashboard`}
            className="flex items-center gap-4 bg-white rounded-2xl border border-[var(--color-border)] p-4 sm:p-5 hover:border-[var(--color-primary)] hover:shadow-md transition-all group shadow-xs"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-[var(--color-border)] shadow-2xs ${
                c.logoUrl ? "bg-white" : "bg-[var(--color-primary)]"
              }`}
              aria-hidden="true"
            >
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-lg">{c.name[0].toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-[var(--color-text-heading)] truncate">{c.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{BUSINESS_LABEL[c.businessType] ?? c.businessType}</p>
            </div>
            <span className="text-[var(--color-text-subtle)] group-hover:text-[var(--color-primary)] transition-colors font-bold" aria-hidden="true">→</span>
          </Link>
        ))}

        <Link
          href="/onboarding"
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] p-4 text-xs font-bold text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors bg-white/60 shadow-2xs"
        >
          + Cadastrar nova empresa
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-4 text-xs text-[var(--color-text-subtle)]">
        <Link href="/orcamentos" className="hover:text-[var(--color-text-heading)] font-semibold transition-colors">Meus orçamentos</Link>
        <span aria-hidden="true">·</span>
        <form action={logoutAction}>
          <button type="submit" className="hover:text-[var(--color-danger)] font-semibold transition-colors cursor-pointer">Sair da conta</button>
        </form>
      </div>
    </div>
  );
}
