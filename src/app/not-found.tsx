import Link from "next/link";
import { KreatorLogo } from "@/components/ui/kreator-logo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = {
  title: "Página não encontrada (404)",
  description: "A página solicitada não foi encontrada ou foi removida.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] text-[var(--color-text-heading)] flex flex-col justify-between selection:bg-[var(--color-navy)] selection:text-white">
      {/* Header */}
      <header className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <KreatorLogo size={30} textClassName="font-bold text-[var(--color-text-heading)] text-lg" />
          </Link>
          <Link
            href="/empresas"
            className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] transition-colors"
          >
            Explorar Serviços →
          </Link>
        </div>
      </header>

      {/* Main 404 Card */}
      <main className="max-w-3xl mx-auto px-6 py-16 text-center space-y-8 my-auto">
        <Breadcrumbs
          className="justify-center mb-4"
          items={[
            { name: "Início", url: "/" },
            { name: "Erro 404", url: "/404" },
          ]}
        />

        {/* 404 Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] text-[var(--color-warning)] text-xs font-semibold uppercase tracking-widest shadow-xs">
          <span>Erro 404 · Página Não Encontrada</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-[var(--color-text-heading)]">
          Ops! Não encontramos essa página.
        </h1>

        <p className="text-[var(--color-text-muted)] text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          O link que você acessou pode estar incorreto, ter sido alterado ou o agendamento foi descontinuado.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            href="/"
            className="w-full sm:w-auto px-8 py-3.5 rounded-[var(--radius-card)] bg-[var(--color-navy)] text-white font-bold text-sm hover:bg-[var(--color-navy)] transition-all shadow-md active:scale-95"
          >
            Voltar para a Página Inicial
          </Link>
          <Link
            href="/empresas"
            className="w-full sm:w-auto px-8 py-3.5 rounded-[var(--radius-card)] bg-[var(--color-bg)] border border-[var(--color-border-strong)] text-[var(--color-text)] font-bold text-sm hover:bg-[var(--color-bg-muted)] transition-all shadow-xs"
          >
            Buscar Empresas & Serviços
          </Link>
        </div>

        {/* Helpful links grid */}
        <div className="pt-10 border-t border-[var(--color-border)] grid sm:grid-cols-3 gap-4 text-left">
          <Link
            href="/empresas"
            className="p-4 rounded-[var(--radius-card)] bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:shadow-xs transition-all group"
          >
            <span className="text-xl mb-1 block">🔍</span>
            <strong className="block text-xs font-bold text-[var(--color-text-heading)] group-hover:text-[var(--color-text)]">
              Encontrar Empresas
            </strong>
            <span className="text-[var(--text-2xs)] text-[var(--color-text-muted)]">
              Agende em oficinas, barbearias e pet shops.
            </span>
          </Link>

          <Link
            href="/register"
            className="p-4 rounded-[var(--radius-card)] bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:shadow-xs transition-all group"
          >
            <span className="text-xl mb-1 block">🚀</span>
            <strong className="block text-xs font-bold text-[var(--color-text-heading)] group-hover:text-[var(--color-text)]">
              Cadastrar Minha Empresa
            </strong>
            <span className="text-[var(--text-2xs)] text-[var(--color-text-muted)]">
              Crie sua página de agendamentos em 5 minutos.
            </span>
          </Link>

          <Link
            href="/login"
            className="p-4 rounded-[var(--radius-card)] bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:shadow-xs transition-all group"
          >
            <span className="text-xl mb-1 block">🔑</span>
            <strong className="block text-xs font-bold text-[var(--color-text-heading)] group-hover:text-[var(--color-text)]">
              Área do Cliente & Dono
            </strong>
            <span className="text-[var(--text-2xs)] text-[var(--color-text-muted)]">
              Acesse seu painel e gerencie seus agendamentos.
            </span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] py-6 text-center text-xs text-[var(--color-text-muted)] font-medium">
        <p>© {new Date().getFullYear()} Kreator. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
