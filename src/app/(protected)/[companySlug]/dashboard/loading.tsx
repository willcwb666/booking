import { Skeleton } from "@/components/ui/skeleton";

/**
 * Carregamento do painel.
 *
 * O esqueleto tem a forma do painel real — cabeçalho, grade assimétrica de
 * "Agora", faixa de KPIs e a área do gráfico. Reservar o espaço certo é o que
 * evita o salto de layout quando os dados chegam, e é o salto que o usuário
 * percebe como lentidão. Passou a fazer falta quando o painel virou consulta
 * agregada com comparação de período.
 */
export default function DashboardLoading() {
  return (
    <div className="page-container pb-20">
      <div className="page-content space-y-8" aria-busy="true" aria-live="polite">
        <span className="sr-only">Carregando o painel…</span>

        <div className="page-header">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-7 w-48 rounded-[var(--radius-control)]" />
            <Skeleton className="h-4 w-72 rounded-[var(--radius-control)]" />
          </div>
          <Skeleton className="h-9 w-32 rounded-[var(--radius-control)]" />
        </div>

        <section className="space-y-3">
          <Skeleton className="h-4 w-24 rounded-[var(--radius-control)]" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-7 rounded-[var(--radius-panel)] border border-[var(--color-border)] p-5 space-y-4">
              <Skeleton className="h-3 w-32 rounded-[var(--radius-control)]" />
              <Skeleton className="h-10 w-24 rounded-[var(--radius-control)]" />
              <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
            </div>
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[104px] rounded-[var(--radius-card)]" />
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <Skeleton className="h-4 w-32 rounded-[var(--radius-control)]" />
          <Skeleton className="h-9 w-full max-w-md rounded-[var(--radius-control)]" />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[104px] rounded-[var(--radius-card)]" />
            ))}
          </div>

          <Skeleton className="h-[360px] rounded-[var(--radius-card)]" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Skeleton className="lg:col-span-5 h-64 rounded-[var(--radius-card)]" />
            <Skeleton className="lg:col-span-7 h-64 rounded-[var(--radius-card)]" />
          </div>
        </section>
      </div>
    </div>
  );
}
