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

  if (companies.length === 0) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <p className="text-sm text-gray-500 mb-1">Olá, {session.user.name}</p>
        <h1 className="text-2xl font-bold text-gray-900">Selecione o ambiente</h1>
        <p className="text-sm text-gray-500 mt-1">Escolha a empresa que deseja gerenciar.</p>
      </div>

      <div className="w-full max-w-md space-y-3">
        {companies.map((c) => (
          <Link
            key={c.id}
            href={`/${c.slug}/dashboard`}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-400 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0" aria-hidden="true">
              <span className="text-white font-bold text-lg">{c.name[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
              <p className="text-xs text-gray-500">{BUSINESS_LABEL[c.businessType] ?? c.businessType}</p>
            </div>
            <span className="text-gray-300 group-hover:text-blue-500 transition-colors" aria-hidden="true">→</span>
          </Link>
        ))}

        {dbUser?.allowMultiCompany && (
          <Link
            href="/onboarding"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 p-4 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            + Cadastrar nova empresa
          </Link>
        )}
      </div>

      <div className="mt-8 flex items-center gap-4 text-xs text-gray-400">
        <Link href="/orcamentos" className="hover:text-gray-600">Meus orçamentos</Link>
        <span aria-hidden="true">·</span>
        <form action={logoutAction}>
          <button type="submit" className="hover:text-gray-600">Sair da conta</button>
        </form>
      </div>
    </div>
  );
}
