import Link from "next/link";
import { KreatorLogo } from "@/components/ui/kreator-logo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = {
  title: "Termos de Uso do Serviço",
  description:
    "Termos e condições gerais de uso da plataforma Kreator para prestadores de serviços, empresas e clientes.",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)] text-[var(--color-text-heading)] font-sans selection:bg-[var(--color-navy)] selection:text-white">
      {/* Header */}
      <header className="bg-[var(--color-bg)] border-b border-[var(--color-border)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <KreatorLogo size={30} textClassName="font-bold text-[var(--color-text-heading)] text-lg" />
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-heading)] transition-colors"
          >
            ← Voltar ao Início
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <Breadcrumbs
          items={[
            { name: "Início", url: "/" },
            { name: "Termos de Uso", url: "/termos" },
          ]}
        />

        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text)] bg-[var(--color-bg-muted)] px-3 py-1 rounded-full border border-[var(--color-border-strong)]">
            Regras e Condições da Plataforma
          </span>
          <h1 className="text-3xl sm:text-5xl font-semibold text-[var(--color-text-heading)] tracking-tight">
            Termos de Uso
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] font-medium">
            Última atualização: 18 de Agosto de 2026
          </p>
        </div>

        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-8 sm:p-12 shadow-sm space-y-8 text-[var(--color-text)] leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma <strong>Kreator</strong>, você concorda expressamente com todos os termos e condições descritos neste documento. Caso não concorde com qualquer cláusula, solicitamos que não utilize nossos serviços.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">2. Descrição dos Serviços</h2>
            <p>
              A Kreator disponibiliza um software como serviço (SaaS) para gestão de agendas, catálogo de serviços, orçamentos, promoções temporárias e confirmação de agendamentos entre empresas prestadoras de serviços e seus respectivos clientes finais.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">3. Responsabilidades dos Usuários e Empresas</h2>
            <ul className="list-disc pl-6 space-y-2 text-[var(--color-text-muted)]">
              <li>
                <strong>Empresas e Prestadores:</strong> São integralmente responsáveis pela veracidade dos preços, descrições de serviços, cumprimento dos horários agendados e pela qualidade dos atendimentos prestados.
              </li>
              <li>
                <strong>Clientes Finais:</strong> São responsáveis por fornecer informações de contato válidas (nome, WhatsApp, e-mail) e por honrar as reservas ou solicitar cancelamentos com a antecedência devida.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">4. Planos, Assinaturas e Pagamentos</h2>
            <p>
              A plataforma oferece planos gratuitos e planos pagos por assinatura mensal ou anual. O cancelamento pode ser efetuado a qualquer momento pelo painel de controle do assinante, sem cobrança de taxas de rescisão.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">5. Cancelamentos e No-Shows</h2>
            <p>
              Cada empresa cadastrada pode definir suas próprias políticas de cancelamento e tolerância a atrasos. A plataforma disponibiliza as ferramentas para automação de avisos e notificações, mas não se responsabiliza por disputas financeiras decorrentes de atendimentos presenciais entre empresas e seus clientes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">6. Propriedade Intelectual</h2>
            <p>
              Todos os elementos visuais, códigos, marcas e interfaces da Kreator são de propriedade exclusiva da Kreator. É proibida qualquer reprodução, engenharia reversa ou cópia não autorizada.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">7. Foro e Legislação Aplicável</h2>
            <p>
              Estes termos são regidos pelas leis da República Federativa do Brasil. Para dirimir qualquer controvérsia decorrente deste instrumento, fica eleito o Foro da Comarca de Curitiba/PR.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] py-8 text-center text-xs text-[var(--color-text-muted)]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Kreator. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:text-[var(--color-text-heading)] underline">
              Política de Privacidade
            </Link>
            <Link href="/" className="hover:text-[var(--color-text-heading)] underline">
              Início
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
