import { db } from "@/lib/db";
import Link from "next/link";

const BUSINESS_LABELS: Record<string, string> = {
  HOME_CLEANING: "Limpeza residencial",
  PET_GROOMER:   "Pet grooming",
  CAR_WASH:      "Lavar carros",
  POOL_CLEANING: "Limpeza de piscina",
  LAWN_CARE:     "Jardinagem",
  BARBER:        "Barbearia",
  HAIR_SALON:    "Salão de beleza",
  PHOTOGRAPHER:  "Fotografia",
  OTHER:         "Outros",
};

export const revalidate = 60; // revalida a cada 60s

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const { q, tipo } = await searchParams;

  const companies = await db.company.findMany({
    where: {
      isActive: true,
      ...(tipo ? { businessType: tipo as never } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      businessType: true,
      logoUrl: true,
      address: true,
      _count: {
        select: {
          bookings: { where: { status: "COMPLETED" } },
          reviews: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const tipos = Object.entries(BUSINESS_LABELS);

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-semibold text-stone-900">
            agendei<span className="text-amber-500">.</span>
          </Link>
          <Link href="/login" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
            Entrar
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900 mb-1">Encontre um serviço</h1>
          <p className="text-stone-500 text-sm">Agende online em segundos, sem telefonema.</p>
        </div>

        {/* Search + filter */}
        <form method="get" className="flex flex-col sm:flex-row gap-3 mb-8">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar empresa..."
            className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
          <select
            name="tipo"
            defaultValue={tipo}
            className="border border-stone-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Todos os tipos</option>
            {tipos.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition-colors"
          >
            Buscar
          </button>
        </form>

        {companies.length === 0 ? (
          <p className="text-center text-stone-400 py-20">Nenhuma empresa encontrada.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/book/${c.slug}`}
                className="bg-white border border-stone-200 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg shrink-0 group-hover:bg-amber-200 transition-colors">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 truncate">{c.name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {BUSINESS_LABELS[c.businessType] ?? c.businessType}
                    </p>
                    {c.address && (
                      <p className="text-xs text-stone-400 mt-1 truncate">{c.address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-stone-100">
                  <span className="text-xs text-stone-500">
                    <span className="font-medium text-stone-700">{c._count.bookings}</span> serviços
                  </span>
                  {c._count.reviews > 0 && (
                    <span className="text-xs text-stone-500">
                      <span className="font-medium text-amber-500">★</span>{" "}
                      <span className="font-medium text-stone-700">{c._count.reviews}</span> avaliações
                    </span>
                  )}
                  <span className="ml-auto text-xs font-medium text-amber-600 group-hover:underline">
                    Agendar →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
