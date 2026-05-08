import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-full bg-stone-50 text-stone-900">
      {/* ── Nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-stone-50/80 backdrop-blur-lg border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            agendei<span className="text-amber-500">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-stone-600 hover:text-stone-900 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-full hover:bg-stone-800 transition-colors"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="pt-32 pb-20 md:pt-44 md:pb-32 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm font-medium text-amber-600 tracking-wide uppercase mb-6">
              Agendamentos online
            </p>
            <h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal leading-[0.95] tracking-tight"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Seu cliente agendou.
              <br />
              <span className="italic text-amber-500">Ele vai lembrar.</span>
            </h1>
            <p className="mt-8 text-lg md:text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed">
              Link de agendamento, pagamentos integrados e notificações push
              que chegam antes da visita. Sem telefonema, sem esquecimento.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto text-center font-medium bg-stone-900 text-white px-8 py-3.5 rounded-full text-base hover:bg-stone-800 transition-colors"
              >
                Comece grátis
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto text-center font-medium text-stone-500 px-8 py-3.5 rounded-full text-base border border-stone-300 hover:border-stone-400 hover:text-stone-700 transition-colors"
              >
                Já tenho conta
              </Link>
            </div>
            <p className="mt-5 text-xs text-stone-400">
              Sem cartão de crédito &middot; Pronto em 5 minutos
            </p>
          </div>
        </section>

        {/* ── Social proof strip ── */}
        <section className="border-y border-stone-200/60 bg-stone-100/50">
          <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-center">
            {[
              ["2.400+", "agendamentos"],
              ["98%", "presença"],
              ["4.9", "avaliação média"],
              ["< 2min", "para agendar"],
            ].map(([num, label]) => (
              <div key={label} className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-stone-900 tabular-nums">
                  {num}
                </span>
                <span className="text-sm text-stone-500">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Demo card ── */}
        <section className="py-20 md:py-28 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-6 md:p-10 grid md:grid-cols-2 gap-8 md:gap-12">
                {/* Left: mock booking */}
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-4">
                    Como seu cliente vê
                  </p>
                  <div className="space-y-3">
                    {[
                      {
                        service: "Limpeza residencial",
                        time: "09:00 — 11:00",
                        price: "R$ 180",
                      },
                      {
                        service: "Limpeza de vidros",
                        time: "Adicional",
                        price: "+ R$ 40",
                      },
                    ].map((item) => (
                      <div
                        key={item.service}
                        className="flex items-center justify-between p-4 rounded-xl bg-stone-50 border border-stone-100"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.service}</p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {item.time}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-stone-700">
                          {item.price}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200/60">
                      <span className="text-sm font-medium text-amber-700">
                        Total
                      </span>
                      <span className="text-base font-bold text-amber-700">
                        R$ 220
                      </span>
                    </div>
                  </div>
                  <button className="mt-4 w-full bg-stone-900 text-white py-3 rounded-xl text-sm font-medium cursor-default">
                    Confirmar agendamento
                  </button>
                </div>

                {/* Right: notification timeline */}
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-4">
                    O que acontece depois
                  </p>
                  <div className="space-y-0">
                    {[
                      {
                        time: "Agora",
                        text: "Confirmação enviada por e-mail",
                        dot: "bg-emerald-500",
                      },
                      {
                        time: "24h antes",
                        text: "Lembrete push no celular",
                        dot: "bg-amber-500",
                      },
                      {
                        time: "2h antes",
                        text: "Último lembrete push",
                        dot: "bg-amber-500",
                      },
                      {
                        time: "Após serviço",
                        text: "Pedido de avaliação",
                        dot: "bg-blue-500",
                      },
                    ].map((step, i, arr) => (
                      <div key={step.time} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-2.5 h-2.5 rounded-full mt-1.5 ${step.dot}`}
                          />
                          {i < arr.length - 1 && (
                            <div className="w-px flex-1 bg-stone-200 my-1" />
                          )}
                        </div>
                        <div className="pb-6">
                          <p className="text-xs font-medium text-stone-400">
                            {step.time}
                          </p>
                          <p className="text-sm font-medium text-stone-700 mt-0.5">
                            {step.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-20 md:py-28 px-6 bg-stone-100/50 border-y border-stone-200/60">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-medium text-amber-600 tracking-wide uppercase mb-3">
              Funcionalidades
            </p>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight leading-tight"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Tudo que seu negócio precisa.
              <br />
              <span className="text-stone-400">Nada que não precisa.</span>
            </h2>

            <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-stone-200 rounded-2xl overflow-hidden border border-stone-200">
              {[
                {
                  title: "Agendamento 24h",
                  desc: "Link público. Cliente escolhe serviço, horário e confirma sozinho.",
                },
                {
                  title: "Push + E-mail",
                  desc: "Confirmação na hora. Lembrete 24h e 2h antes. Ninguém esquece.",
                },
                {
                  title: "Pagamento integrado",
                  desc: "Cartão via Stripe ou dinheiro no dia. Tudo rastreado no painel.",
                },
                {
                  title: "Gestão de equipe",
                  desc: "Convide funcionários, defina agendas individuais, acompanhe tudo.",
                },
                {
                  title: "Avaliações",
                  desc: "Após cada serviço o cliente avalia. Você acompanha média e comentários.",
                },
                {
                  title: "App mobile",
                  desc: "Seus clientes instalam, recebem push e acompanham no celular.",
                },
              ].map((f) => (
                <div key={f.title} className="bg-white p-7 md:p-8">
                  <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="py-20 md:py-28 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-medium text-amber-600 tracking-wide uppercase mb-3">
              Como funciona
            </p>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight leading-tight mb-16"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Três passos. Cinco minutos.
            </h2>

            <div className="grid md:grid-cols-3 gap-12 md:gap-8">
              {[
                {
                  n: "01",
                  title: "Cadastre sua empresa",
                  desc: "Adicione serviços, horários de atendimento e publique seu link de agendamento.",
                },
                {
                  n: "02",
                  title: "Clientes agendam",
                  desc: "Pelo link ou app — escolhem serviço, data, horário e pagam online.",
                },
                {
                  n: "03",
                  title: "Você gerencia",
                  desc: "Painel com calendário, equipe, financeiro e avaliações em tempo real.",
                },
              ].map((step) => (
                <div key={step.n}>
                  <span className="text-5xl font-light text-stone-200 block mb-4">
                    {step.n}
                  </span>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-6 pb-20 md:pb-28">
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl bg-stone-900 p-10 md:p-16 text-center">
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-normal text-white tracking-tight leading-tight"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Pronto para parar de perder
                <br />
                <span className="italic text-amber-400">clientes esquecidos?</span>
              </h2>
              <p className="mt-5 text-stone-400 max-w-lg mx-auto">
                Crie sua conta em 5 minutos. Sem cartão de crédito.
                Seus clientes agendam hoje.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto text-center font-medium bg-amber-400 text-stone-900 px-8 py-3.5 rounded-full text-base hover:bg-amber-300 transition-colors"
                >
                  Criar minha conta grátis
                </Link>
                <Link
                  href="/login"
                  className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
                >
                  Já tenho conta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200/60 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold">
            agendei<span className="text-amber-500">.</span>
          </span>
          <p className="text-xs text-stone-400">
            &copy; {new Date().getFullYear()} Agendei. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
