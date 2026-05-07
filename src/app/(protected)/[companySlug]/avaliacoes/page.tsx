import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getReviews, getReviewStats } from "@/server/queries/reviews";
import { notFound } from "next/navigation";
import Link from "next/link";

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-yellow-400" : "text-gray-200"}>★</span>
      ))}
    </span>
  );
}

export default async function AvaliacoesPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { companySlug } = await params;
  const { page } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const [{ items, total, pageCount }, stats] = await Promise.all([
    getReviews(company.id, currentPage),
    getReviewStats(company.id),
  ]);

  const pathname = `/${companySlug}/avaliacoes`;

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Avaliações</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} avaliação{total !== 1 ? "ões" : ""}</p>
          </div>
          {stats.average !== null && (
            <div className="text-center bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3">
              <p className="text-3xl font-bold text-yellow-600">{stats.average.toFixed(1)}</p>
              <Stars rating={Math.round(stats.average)} />
              <p className="text-xs text-gray-500 mt-0.5">{stats.count} avaliações</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-sm">Nenhuma avaliação ainda.</p>
            <p className="text-xs text-gray-400 mt-1">
              Compartilhe o link de avaliação com clientes após concluir um serviço.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Stars rating={item.rating} />
                      <span className="text-sm font-semibold text-gray-900">
                        {item.reviewerName ?? "Cliente"}
                      </span>
                    </div>
                    {item.comment && (
                      <p className="text-sm text-gray-700 mt-1">{item.comment}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">
                      {item.scheduledDate.split("-").reverse().join("/")}
                    </p>
                    <Link
                      href={`/${companySlug}/agendamentos/${item.bookingId}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver agendamento
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {pageCount > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                {currentPage > 1 && (
                  <Link href={`${pathname}?page=${currentPage - 1}`} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                    Anterior
                  </Link>
                )}
                <span className="px-3 py-1.5 text-sm text-gray-500">
                  {currentPage} / {pageCount}
                </span>
                {currentPage < pageCount && (
                  <Link href={`${pathname}?page=${currentPage + 1}`} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                    Próxima
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
