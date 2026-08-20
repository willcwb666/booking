import Link from "next/link";
import { KreatorLogo } from "@/components/ui/kreator-logo";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = {
  title: "Política de Privacidade e Proteção de Dados",
  description:
    "Saiba como a Kreator coleta, utiliza, armazena e protege seus dados pessoais em conformidade com a LGPD e GDPR.",
};

export default function PrivacidadePage() {
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
            { name: "Política de Privacidade", url: "/privacidade" },
          ]}
        />

        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-success)] bg-[var(--color-success-light)] px-3 py-1 rounded-full border border-[var(--color-success-border)]">
            Conformidade LGPD & GDPR
          </span>
          <h1 className="text-3xl sm:text-5xl font-semibold text-[var(--color-text-heading)] tracking-tight">
            Política de Privacidade
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] font-medium">
            Última atualização: 18 de Agosto de 2026
          </p>
        </div>

        <div className="bg-[var(--color-bg)] rounded-[var(--radius-panel)] border border-[var(--color-border)] p-8 sm:p-12 shadow-sm space-y-8 text-[var(--color-text)] leading-relaxed text-sm sm:text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">1. Introdução e Compromisso</h2>
            <p>
              A <strong>Kreator</strong> (&ldquo;nós&rdquo;, &ldquo;plataforma&rdquo; ou &ldquo;serviço&rdquo;) tem o compromisso inegociável de respeitar e proteger a sua privacidade. Esta Política de Privacidade descreve de forma clara e transparente como coletamos, utilizamos, armazenamos e protegemos os seus dados pessoais ao utilizar nossa plataforma SaaS de agendamentos, orçamentos e gestão.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">2. Dados que Coletamos</h2>
            <p>Podemos coletar os seguintes tipos de informações:</p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--color-text-muted)]">
              <li>
                <strong>Informações de Cadastro da Empresa:</strong> Nome da empresa, e-mail comercial, telefone/WhatsApp, endereço físico, logotipo e dados de faturamento.
              </li>
              <li>
                <strong>Informações dos Clientes Finais:</strong> Nome completo, número de telefone, e-mail e preferências de agendamento informadas no momento da reserva.
              </li>
              <li>
                <strong>Dados Técnicos e de Navegação:</strong> Endereço IP, tipo de navegador, sistema operacional, páginas visitadas e identificadores de cookies para segurança e prevenção contra fraudes.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">3. Finalidade do Tratamento dos Dados</h2>
            <p>Utilizamos os dados coletados estritamente para:</p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--color-text-muted)]">
              <li>Processar, confirmar e gerenciar agendamentos e orçamentos solicitados;</li>
              <li>Enviar notificações e lembretes automáticos via WhatsApp, SMS ou e-mail;</li>
              <li>Processar pagamentos seguros e emitir recibos digitais;</li>
              <li>Prevenir fraudes, garantir a segurança da infraestrutura e cumprir obrigações legais;</li>
              <li>Aprimorar a experiência do usuário e performance da plataforma.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">4. Compartilhamento e Não Comercialização</h2>
            <p>
              <strong>Nós nunca vendemos nem comercializamos seus dados pessoais com terceiros.</strong> Os dados podem ser compartilhados exclusivamente com:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[var(--color-text-muted)]">
              <li>A empresa/prestador de serviço escolhido pelo cliente para a realização do atendimento;</li>
              <li>Provedores de infraestrutura essencial (ex.: processadores de pagamento Stripe/Mercado Pago, serviços de envio de e-mail e hospedagem segura em nuvem);</li>
              <li>Autoridades judiciais quando formalmente requisitado por lei.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">5. Segurança dos Dados</h2>
            <p>
              Adotamos padrões rígidos de criptografia (SSL/TLS ponta a ponta), isolamento de bancos de dados por tenant e controle rigoroso de acessos para proteger todas as informações contra acessos não autorizados, perdas ou alterações.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">6. Seus Direitos (LGPD e GDPR)</h2>
            <p>
              Você possui o direito de solicitar a qualquer momento: confirmação da existência de tratamento, acesso aos seus dados, correção de dados incompletos ou inexatos, anonimização, bloqueio ou eliminação de dados desnecessários, e a revogação do consentimento.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-text-heading)]">7. Contato do Encarregado de Dados (DPO)</h2>
            <p>
              Para exercer seus direitos ou esclarecer qualquer dúvida sobre esta política, entre em contato com nosso Encarregado de Proteção de Dados pelo e-mail:{" "}
              <a href="mailto:privacidade@kreator.com.br" className="text-[var(--color-success)] font-bold underline">
                privacidade@kreator.com.br
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)] py-8 text-center text-xs text-[var(--color-text-muted)]">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Kreator. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <Link href="/termos" className="hover:text-[var(--color-text-heading)] underline">
              Termos de Uso
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
