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
        <span key={s} className={s <= rating ? "text-[var(--color-warning)]" : "text-[var(--color-border-strong)]"}>★</span>
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
    <div className="page-container">
     <div className="page-content space-y-6">
      <div className="page-header !mb-0 flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Avaliações</h1>
          <p className="page-description">{total} avaliação{total !== 1 ? "ões" : ""}</p>
        </div>
        {stats.average !== null && (
          <div className="text-center bg-[var(--color-warning-light)] border border-[var(--color-warning-border)] rounded-[var(--radius-control)] px-5 py-3 shrink-0">
            <p className="text-3xl font-bold text-[var(--color-warning)]">{stats.average.toFixed(1)}</p>
            <Stars rating={Math.round(stats.average)} />
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{stats.count} avaliações</p>
          </div>
        )}
      </div>

      <div>
        {items.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-[var(--color-text-muted)] text-sm">Nenhuma avaliação ainda.</p>
            <p className="text-xs text-[var(--color-text-subtle)] mt-1">
              Compartilhe o link de avaliação com clientes após concluir um serviço.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="card card-body">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Stars rating={item.rating} />
                      <span className="text-sm font-semibold text-[var(--color-text-heading)]">
                        {item.reviewerName ?? "Cliente"}
                      </span>
                    </div>
                    {item.comment && (
                      <p className="text-sm text-[var(--color-text)] mt-1">{item.comment}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[var(--color-text-subtle)]">
                      {item.scheduledDate.split("-").reverse().join("/")}
                    </p>
                    <Link
                      href={`/${companySlug}/agendamentos/${item.bookingId}`}
                      className="text-xs text-[var(--color-primary)] hover:underline"
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
                  <Link href={`${pathname}?page=${currentPage - 1}`} className="btn btn-outline btn-sm">
                    Anterior
                  </Link>
                )}
                <span className="px-3 py-1.5 text-sm text-[var(--color-text-muted)]">
                  {currentPage} / {pageCount}
                </span>
                {currentPage < pageCount && (
                  <Link href={`${pathname}?page=${currentPage + 1}`} className="btn btn-outline btn-sm">
                    Próxima
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
     </div>
    </div>
  );
}
