import "server-only";
import { db } from "@/lib/db";
import { WEEKDAY_LABELS, type OccupancyCell, type OccupancyGrid } from "@/lib/off-peak";

/**
 * Ocupação real por dia da semana e faixa de horário.
 *
 * Existe para a sugestão de janela ociosa não ser chute. O dono acha que sabe
 * quais horários estão vazios — e às vezes sabe —, mas "terça de manhã" e
 * "quinta depois do almoço" costumam se confundir na memória. Aqui é contagem.
 *
 * A referência é o número de agendamentos, não a taxa contra capacidade
 * teórica: calcular capacidade exigiria expandir a grade da agenda com
 * exceções, feriados e profissionais ativos em cada data passada — muito
 * cálculo para uma comparação que o dono faz de olho entre as próprias faixas.
 */

export async function getOccupancyGrid(
  companyId: string,
  daysBack = 90
): Promise<OccupancyGrid> {
  const rows = await db.$queryRawUnsafe<
    Array<{ weekday: number; hour: number; bookings: number }>
  >(
    `SELECT EXTRACT(DOW FROM b."scheduledDate"::date)::int          AS weekday,
            split_part(b."scheduledStartTime", ':', 1)::int         AS hour,
            COUNT(*)::int                                           AS bookings
       FROM "booking" b
      WHERE b."companyId" = $1
        AND b."scheduledDate" >= to_char(CURRENT_DATE - $2::int, 'YYYY-MM-DD')
        AND b."scheduledDate" <= to_char(CURRENT_DATE, 'YYYY-MM-DD')
        -- Cancelado e falta não representam demanda atendida; contá-los
        -- faria um horário problemático parecer cheio.
        AND b."status" IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')
      GROUP BY 1, 2
      ORDER BY 1, 2`,
    companyId,
    daysBack
  );

  const cells = rows.map((r) => ({
    weekday: Number(r.weekday),
    weekdayLabel: WEEKDAY_LABELS[Number(r.weekday)] ?? "—",
    hour: Number(r.hour),
    bookings: Number(r.bookings),
  }));

  return {
    cells,
    max: cells.reduce((m, c) => Math.max(m, c.bookings), 0),
    total: cells.reduce((s, c) => s + c.bookings, 0),
    daysAnalyzed: daysBack,
  };
}
