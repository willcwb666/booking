import React from "react";

const TrendingUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

const TrendingDownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);

const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
);

export default function DashboardPage() {
  const stats = [
    {
      label: "Receita do Mês",
      value: "R$ 14.230",
      trend: "+12.5%",
      positive: true,
      icon: <TrendingUpIcon />,
      color: "text-[#00d924]",
      iconBg: "bg-[#00d924]/10",
    },
    {
      label: "Agendamentos Hoje",
      value: "12",
      trend: "+3",
      positive: true,
      icon: <CalendarIcon />,
      color: "text-[#635bff]",
      iconBg: "bg-[#635bff]/10",
    },
    {
      label: "Pendentes",
      value: "5",
      trend: "-2",
      positive: true, // fewer pending is better
      icon: <ClockIcon />,
      color: "text-[#00d4ff]",
      iconBg: "bg-[#00d4ff]/10",
    },
    {
      label: "Avaliação Média",
      value: "4.9",
      trend: "+0.1",
      positive: true,
      icon: <StarIcon />,
      color: "text-[#ffd900]",
      iconBg: "bg-[#ffd900]/10",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-white border border-[#e3e8ee] shadow-[0_2px_5px_rgba(0,0,0,0.02)] hover:shadow-[0_5px_15px_rgba(0,0,0,0.05)] transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color} ${stat.iconBg}`}>
                {stat.icon}
              </div>
              <div className={`flex items-center gap-1 text-[12px] font-bold px-2 py-1 rounded-md ${stat.positive ? "bg-[#e8f6e8] text-[#00d924]" : "bg-[#ffebee] text-[#ff6b6b]"}`}>
                {stat.positive ? <TrendingUpIcon /> : <TrendingDownIcon />}
                {stat.trend}
              </div>
            </div>
            <div className="mt-auto">
              <p className="text-[#697386] text-[13px] font-semibold mb-1 uppercase tracking-wide">{stat.label}</p>
              <h3 className="text-3xl font-bold text-[#0a2540] tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Upcoming Bookings ── */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#e3e8ee] shadow-[0_2px_5px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-[#e3e8ee] bg-[#f6f9fc]/50">
            <h2 className="text-[16px] font-bold text-[#0a2540]">Próximos Agendamentos</h2>
            <button className="text-[13px] font-bold text-[#635bff] hover:text-[#0a2540] transition-colors">
              Ver todos &rarr;
            </button>
          </div>
          
          <div className="flex-1">
            {[
              { client: "Ana Clara Silva", service: "Limpeza Residencial", time: "09:00 - 11:00", status: "Confirmado", color: "text-[#00d924] bg-[#e8f6e8]" },
              { client: "Marcelo Almeida", service: "Higienização Estofados", time: "11:30 - 13:00", status: "Em Andamento", color: "text-[#00d4ff] bg-[#e6f9ff]" },
              { client: "Juliana Santos", service: "Faxina Pesada", time: "14:00 - 18:00", status: "Pendente", color: "text-[#ff9800] bg-[#fff5e5]" },
              { client: "Roberto Dias", service: "Limpeza de Vidros", time: "18:30 - 19:30", status: "Pendente", color: "text-[#ff9800] bg-[#fff5e5]" },
            ].map((booking, i) => (
              <div key={i} className="group flex items-center justify-between p-5 border-b border-[#e3e8ee] last:border-0 hover:bg-[#f6f9fc] transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#f6f9fc] flex items-center justify-center text-[#0a2540] font-bold border border-[#e3e8ee]">
                    {booking.client.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-[#0a2540] font-bold text-[15px]">{booking.client}</h4>
                    <p className="text-[13px] text-[#425466] mt-0.5">{booking.service}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#0a2540] font-bold text-[14px] mb-1.5">{booking.time}</div>
                  <div className="inline-flex items-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${booking.color}`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick Actions & Recent Reviews ── */}
        <div className="space-y-6 flex flex-col">
          {/* Quick Actions */}
          <div className="rounded-2xl bg-white border border-[#e3e8ee] shadow-[0_2px_5px_rgba(0,0,0,0.02)] p-6">
            <h2 className="text-[16px] font-bold text-[#0a2540] mb-4">Acesso Rápido</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[#f6f9fc] border border-transparent hover:border-[#635bff]/30 hover:shadow-sm transition-all group">
                <div className="p-2 rounded-md bg-white text-[#635bff] shadow-sm group-hover:scale-110 transition-transform">
                  <CalendarIcon />
                </div>
                <span className="text-[13px] font-bold text-[#425466] group-hover:text-[#0a2540]">Criar Bloqueio</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[#f6f9fc] border border-transparent hover:border-[#00d4ff]/30 hover:shadow-sm transition-all group">
                <div className="p-2 rounded-md bg-white text-[#00d4ff] shadow-sm group-hover:scale-110 transition-transform">
                  <ClockIcon />
                </div>
                <span className="text-[13px] font-bold text-[#425466] group-hover:text-[#0a2540]">Nova Agenda</span>
              </button>
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="flex-1 rounded-2xl bg-white border border-[#e3e8ee] shadow-[0_2px_5px_rgba(0,0,0,0.02)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-[#0a2540]">Últimas Avaliações</h2>
            </div>
            <div className="space-y-3">
              {[
                { name: "Sônia R.", text: "Serviço impecável! Muito pontuais e cuidadosos.", stars: 5 },
                { name: "Carlos M.", text: "Excelente atendimento, recomendo a todos.", stars: 5 },
              ].map((review, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#f6f9fc] border border-[#e3e8ee]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[14px] font-bold text-[#0a2540]">{review.name}</span>
                    <div className="flex items-center text-[#ffd900]">
                      {[...Array(review.stars)].map((_, j) => (
                        <StarIcon key={j} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[13px] text-[#425466] leading-relaxed">
                    "{review.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
