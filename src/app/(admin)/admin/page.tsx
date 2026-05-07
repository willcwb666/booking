import { getAdminStats } from "@/server/queries/admin";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  const cards = [
    {
      label: "Empresas",
      value: stats.totalCompanies,
      sub: "Cadastradas na plataforma",
      href: "/admin/companies",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Usuários",
      value: stats.totalUsers,
      sub: "Contas registradas",
      href: "/admin/users",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Agendamentos",
      value: stats.totalBookings,
      sub: `${stats.pendingBookings} aguardando confirmação`,
      href: "#",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Receita total",
      value: stats.totalRevenue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      sub: "Pagamentos confirmados",
      href: "#",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Visão geral</h1>
        <p className="text-sm text-gray-500 mt-1">Métricas globais da plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow block ${card.href === "#" ? "pointer-events-none" : ""}`}
          >
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <span className={`text-xl font-bold ${card.color}`}>
                {typeof card.value === "number" ? card.value : "R$"}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.label}</p>
            <p className="text-xs text-gray-400">{card.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Link
          href="/admin/companies"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
        >
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Gerenciar empresas</h2>
          <p className="text-xs text-gray-500">
            Ativar, desativar e visualizar empresas cadastradas
          </p>
        </Link>
        <Link
          href="/admin/users"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
        >
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Gerenciar usuários</h2>
          <p className="text-xs text-gray-500">
            Banir, desbanir e promover usuários a administrador
          </p>
        </Link>
      </div>
    </div>
  );
}
