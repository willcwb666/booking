import Link from "next/link";

function IconCalendar() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconCreditCard() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const features = [
  {
    icon: <IconCalendar />,
    title: "Agendamento online 24h",
    description: "Seus clientes agendam pelo link público, escolhem horário disponível e confirmam na hora — sem telefonema.",
  },
  {
    icon: <IconBell />,
    title: "Notificações push + e-mail",
    description: "Confirmação na hora do agendamento. Lembrete no dia anterior. Seu cliente nunca mais vai \"esquecer\" que tem serviço.",
  },
  {
    icon: <IconCreditCard />,
    title: "Pagamento integrado",
    description: "Receba no cartão antes da visita via Stripe. Ou registre pagamento em dinheiro. Tudo rastreado.",
  },
  {
    icon: <IconUsers />,
    title: "Gestão de equipe",
    description: "Convide funcionários, defina agendas individuais, veja a agenda de toda a equipe no calendário.",
  },
  {
    icon: <IconStar />,
    title: "Avaliações",
    description: "Após cada serviço, o cliente avalia. Você acompanha a média e os comentários no painel.",
  },
  {
    icon: <IconPhone />,
    title: "App mobile para clientes",
    description: "Seus clientes instalam o app, recebem push notifications e acompanham os agendamentos na palma da mão.",
  },
];

const steps = [
  {
    number: "01",
    title: "Crie sua conta",
    description: "Cadastre sua empresa em minutos. Adicione seus serviços, defina os horários e publique o link de agendamento.",
  },
  {
    number: "02",
    title: "Clientes agendam",
    description: "Compartilhe o link. Clientes escolhem serviço, profissional, data e pagam — tudo no celular ou computador.",
  },
  {
    number: "03",
    title: "Você gerencia",
    description: "Acompanhe agenda, pagamentos e avaliações no painel. A equipe recebe a agenda do dia direto no app.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-full flex flex-col bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            Agendei
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar conta grátis
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            App mobile com push notifications — em breve
          </div>

          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight tracking-tight max-w-3xl mx-auto">
            Seu cliente agendou.{" "}
            <span className="text-blue-600">Ele vai lembrar.</span>
          </h1>

          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Agendamentos online, pagamentos integrados e notificações push que chegam antes da visita —
            para empresas de serviços que não podem se dar ao luxo de clientes esquecidos.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto text-base font-semibold bg-blue-600 text-white px-8 py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              Começar grátis
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto text-base font-medium text-gray-700 border border-gray-200 px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Já tenho conta
            </Link>
          </div>

          <p className="mt-4 text-sm text-gray-400">
            Sem cartão de crédito · Configuração em 5 minutos
          </p>
        </section>

        {/* Pain point banner */}
        <section className="bg-amber-50 border-y border-amber-100">
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center gap-6">
            <div className="text-4xl">😤</div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">
                "Mandei e-mail de confirmação, fui lá e o cliente não sabia de nada."
              </p>
              <p className="text-gray-600 mt-1">
                E-mail vai para spam. Push notification chega na tela de bloqueio. Com o app Agendei,
                o cliente recebe confirmação + lembrete no dia anterior — e você não bate na porta no escuro.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Tudo que você precisa, em um só lugar</h2>
            <p className="text-gray-500 mt-3 text-lg">Para empresas de limpeza, beleza, saúde, manutenção e mais.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-gray-50 border-y border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-24">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold text-gray-900">Como funciona</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {steps.map((s) => (
                <div key={s.number} className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg mb-5">
                    {s.number}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Checklist CTA */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="bg-blue-600 rounded-3xl px-8 py-14 md:px-16 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 text-white">
              <h2 className="text-3xl font-bold mb-4">Pronto para sair do papel?</h2>
              <ul className="space-y-2 text-blue-100 text-sm">
                {[
                  "Link de agendamento público pronto em minutos",
                  "Clientes recebem push + e-mail de confirmação",
                  "Painel com calendário, equipe e financeiro",
                  "App mobile para seus clientes (em breve)",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-blue-300"><IconCheck /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
              <Link
                href="/register"
                className="text-center font-semibold bg-white text-blue-600 px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors"
              >
                Criar minha conta grátis
              </Link>
              <Link
                href="/login"
                className="text-center text-sm font-medium text-blue-200 hover:text-white transition-colors py-2"
              >
                Já tenho conta → Entrar
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-gray-900">Agendei</span>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Agendei. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
