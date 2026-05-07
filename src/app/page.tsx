import Link from "next/link";

const features = [
  {
    title: "Agendamento 24h",
    desc: "Link público. Cliente escolhe serviço, horário e confirma — sem telefonema, sem WhatsApp.",
    icon: "📅",
  },
  {
    title: "Push + E-mail",
    desc: "Confirmação na hora. Lembrete 24h e 2h antes. Seu cliente nunca mais esquece.",
    icon: "🔔",
  },
  {
    title: "Pagamento integrado",
    desc: "Cartão via Stripe ou dinheiro no dia. Tudo rastreado no painel.",
    icon: "💳",
  },
  {
    title: "Gestão de equipe",
    desc: "Convide funcionários, defina agendas individuais, acompanhe tudo no calendário.",
    icon: "👥",
  },
  {
    title: "Avaliações",
    desc: "Após cada serviço o cliente avalia. Você acompanha média e comentários.",
    icon: "⭐",
  },
  {
    title: "App mobile",
    desc: "Seus clientes instalam, recebem push e acompanham agendamentos no celular.",
    icon: "📱",
  },
];

const steps = [
  { n: "01", title: "Cadastre sua empresa", desc: "Adicione serviços, horários e publique seu link de agendamento." },
  { n: "02", title: "Clientes agendam", desc: "Pelo link ou app — escolhem serviço, data, horário e pagam." },
  { n: "03", title: "Você gerencia", desc: "Painel com calendário, equipe, financeiro e avaliações." },
];

export default function HomePage() {
  return (
    <div className="min-h-full flex flex-col" style={{ background: "var(--warm-gray)" }}>
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b" style={{ background: "rgba(247,245,242,0.9)", borderColor: "var(--warm-gray-dark)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-extrabold tracking-tight" style={{ color: "var(--navy)" }}>
            Agendei<span style={{ color: "var(--gold)" }}>.</span>
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:bg-white/60" style={{ color: "var(--navy)" }}>
              Entrar
            </Link>
            <Link href="/register" className="text-sm font-semibold text-white px-5 py-2.5 rounded-lg transition-all hover:opacity-90" style={{ background: "var(--navy)" }}>
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden noise-bg" style={{ background: "var(--navy)" }}>
          <div className="mesh-gradient absolute inset-0" />
          <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-28 lg:pt-32 lg:pb-36">
            <div className="max-w-3xl">
              <div className="animate-fade-up delay-1">
                <div className="gold-line mb-8" />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-white animate-fade-up delay-2">
                Seu cliente agendou.
                <br />
                <span style={{ color: "var(--gold)" }}>Ele vai lembrar.</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl leading-relaxed animate-fade-up delay-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                Agendamentos online, pagamentos integrados e notificações push que chegam antes da visita — para empresas que não podem se dar ao luxo de clientes esquecidos.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-fade-up delay-4">
                <Link href="/register" className="text-center font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-[1.02]" style={{ background: "var(--gold)", color: "var(--navy)" }}>
                  Começar grátis
                </Link>
                <Link href="/login" className="text-center font-medium px-8 py-4 rounded-xl text-lg border transition-colors hover:bg-white/5" style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
                  Já tenho conta
                </Link>
              </div>
              <p className="mt-5 text-sm animate-fade-up delay-5" style={{ color: "rgba(255,255,255,0.35)" }}>
                Sem cartão de crédito · Pronto em 5 minutos
              </p>
            </div>

            {/* Decorative floating card */}
            <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 animate-float" style={{ animationDelay: "1s" }}>
              <div className="rounded-2xl p-6 w-72 shadow-2xl" style={{ background: "var(--navy-light)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "var(--gold)", color: "var(--navy)" }}>M</div>
                  <div>
                    <p className="text-white text-sm font-semibold">Maria Silva</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Confirmado para amanhã</p>
                  </div>
                </div>
                <div className="rounded-xl p-4 mb-3" style={{ background: "rgba(212,168,83,0.1)", border: "1px solid rgba(212,168,83,0.15)" }}>
                  <p className="text-xs font-medium" style={{ color: "var(--gold)" }}>Limpeza residencial</p>
                  <p className="text-white text-sm font-bold mt-1">08/05 às 09:00</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>R$ 180,00 · Cartão</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-green-400 font-medium">Push enviado ✓</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pain point */}
        <section className="border-b" style={{ background: "#fef9ee", borderColor: "#f5e6c4" }}>
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start gap-6">
            <div className="text-4xl shrink-0">😤</div>
            <div>
              <p className="font-bold text-lg" style={{ color: "var(--navy)" }}>
                &ldquo;Mandei e-mail, fui lá e o cliente não sabia de nada.&rdquo;
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#6b6352" }}>
                E-mail vai para spam. Push notification chega na tela de bloqueio. Com o Agendei, o cliente recebe confirmação + lembrete 24h e 2h antes — você não bate na porta no escuro.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <div className="gold-line mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--navy)" }}>
              Tudo em um só lugar
            </h2>
            <p className="mt-3 text-lg" style={{ color: "#8a8478" }}>
              Para empresas de limpeza, beleza, saúde, manutenção e mais.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="card-lift bg-white rounded-2xl p-7 border" style={{ borderColor: "var(--warm-gray-dark)" }}>
                <span className="text-3xl mb-4 block">{f.icon}</span>
                <h3 className="font-bold text-lg mb-2" style={{ color: "var(--navy)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#8a8478" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y" style={{ background: "var(--navy)", borderColor: "var(--navy-light)" }}>
          <div className="noise-bg relative">
            <div className="relative z-10 max-w-6xl mx-auto px-6 py-24">
              <div className="text-center mb-16">
                <div className="gold-line mx-auto mb-6" />
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Como funciona</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {steps.map((s) => (
                  <div key={s.n} className="text-center">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center font-extrabold text-xl" style={{ background: "var(--gold)", color: "var(--navy)" }}>
                      {s.n}
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center gap-12" style={{ background: "var(--navy)" }}>
            <div className="flex-1">
              <div className="gold-line mb-6" />
              <h2 className="text-3xl font-extrabold text-white mb-4">Pronto para sair do papel?</h2>
              <ul className="space-y-3 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                {[
                  "Link de agendamento pronto em minutos",
                  "Push + e-mail de confirmação e lembrete",
                  "Painel com calendário, equipe e financeiro",
                  "App mobile para seus clientes",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: "var(--gold)", color: "var(--navy)" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
              <Link href="/register" className="text-center font-bold px-10 py-4 rounded-xl text-lg transition-all hover:scale-[1.02]" style={{ background: "var(--gold)", color: "var(--navy)" }}>
                Criar minha conta grátis
              </Link>
              <Link href="/login" className="text-center text-sm font-medium py-2 transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
                Já tenho conta → Entrar
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "var(--warm-gray-dark)" }}>
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-extrabold" style={{ color: "var(--navy)" }}>Agendei<span style={{ color: "var(--gold)" }}>.</span></span>
          <p className="text-sm" style={{ color: "#a09a90" }}>© {new Date().getFullYear()} Agendei. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
