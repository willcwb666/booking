import { Skeleton } from "@/components/ui/skeleton";

/**
 * Carregamento do portal do cliente.
 *
 * A forma segue a tela: cabeçalho, o bloco do próximo horário (que é o
 * protagonista) e as linhas da lista. Reservar o espaço do bloco principal
 * evita que a lista suba e desça quando os dados chegam.
 */
export default function MeusAgendamentosLoading() {
  return (
    <div className="page-container pb-20">
      <div className="page-content space-y-8" aria-busy="true" aria-live="polite">
        <span className="sr-only">Carregando seus agendamentos…</span>

        <div className="page-header">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-7 w-56 rounded-[var(--radius-control)]" />
            <Skeleton className="h-4 w-64 rounded-[var(--radius-control)]" />
          </div>
          <Skeleton className="h-9 w-28 rounded-[var(--radius-control)]" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-3 w-36 rounded-[var(--radius-control)]" />
          <Skeleton className="h-[188px] rounded-[var(--radius-panel)]" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-5 w-28 rounded-[var(--radius-control)]" />
          <div className="card divide-y divide-[var(--color-border)]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <Skeleton className="h-4 w-44 rounded-[var(--radius-control)]" />
                  <Skeleton className="h-3 w-64 rounded-[var(--radius-control)]" />
                </div>
                <Skeleton className="h-8 w-28 rounded-[var(--radius-control)] shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
