/**
 * Desconto em horário ocioso — a metade do yield management que vale a pena.
 *
 * ─── Por que só a metade ─────────────────────────────────────────────────────
 *
 * O desenho original pedia preço dinâmico nos dois sentidos: acréscimo no pico
 * (sábado de manhã) e desconto no vale (terça de manhã). O acréscimo não foi
 * construído, e a decisão é deliberada.
 *
 * A Uber consegue cobrar mais no pico porque a relação é anônima e descartável.
 * Barbearia é o oposto: relação nominal, recorrente, e os clientes conversam
 * entre si. No dia em que o João descobre que pagou R$ 60 no sábado e o Pedro
 * pagou R$ 50 na terça pelo mesmo corte com o mesmo profissional, a empresa não
 * perdeu R$ 10 — perdeu o João. Fresha e Booksy não deixaram isso de fora por
 * limitação técnica; deixaram porque donos de salão recusam.
 *
 * A metade de baixo produz o MESMO efeito de ocupação com risco zero, porque é
 * enquadrada como presente e não como punição. Ninguém se ofende com desconto.
 *
 * ─── Relação com o ghost slot buster ─────────────────────────────────────────
 *
 * `src/lib/agenda/ghost-slot-buster.ts` cobre a vaga que abriu AGORA — um
 * cancelamento de última hora. Aqui é o horário que está sempre vazio, todo
 * mês, e que o dono conhece. São mecanismos distintos e complementares.
 *
 * Funções puras, sem I/O.
 */

export type OffPeakWindow = {
  id: string;
  label: string;
  /** 0 = domingo … 6 = sábado, igual a `Date#getDay`. */
  weekday: number;
  /** "HH:MM" inclusivo. */
  startTime: string;
  /** "HH:MM" exclusivo — um slot que começa exatamente no fim não entra. */
  endTime: string;
  discountPercentage: number;
  isActive: boolean;
};

export type OffPeakMatch = {
  window: OffPeakWindow;
  discountPercentage: number;
  /** Valor do desconto em dinheiro, já arredondado. */
  discountAmount: number;
  finalPrice: number;
};

/** "HH:MM" → minutos desde a meia-noite. `null` quando o formato é inválido. */
export function toMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time?.trim() ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Dia da semana de uma data "YYYY-MM-DD", sem depender do fuso local. */
export function weekdayOf(dateISO: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO?.trim() ?? "");
  if (!m) return null;
  // `Date.UTC` evita o clássico: `new Date("2026-08-19")` é meia-noite UTC, e
  // em fuso negativo `getDay()` devolve o dia anterior.
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d.getUTCDay();
}

export function isValidWindow(w: Pick<OffPeakWindow, "startTime" | "endTime" | "weekday" | "discountPercentage">): boolean {
  const start = toMinutes(w.startTime);
  const end = toMinutes(w.endTime);
  if (start === null || end === null) return false;
  // Janela que vira o dia ("22:00"–"02:00") não é suportada: ela pertenceria a
  // dois dias da semana, e tratar isso implicitamente esconderia o desconto de
  // metade dos horários. Quem precisa cria duas janelas.
  if (end <= start) return false;
  if (!Number.isInteger(w.weekday) || w.weekday < 0 || w.weekday > 6) return false;
  if (!Number.isFinite(w.discountPercentage)) return false;
  if (w.discountPercentage <= 0 || w.discountPercentage > 100) return false;
  return true;
}

/**
 * Desconto aplicável a um horário.
 *
 * Quando duas janelas se sobrepõem, vence a de MAIOR desconto. É a única
 * escolha que o cliente não contesta: ele viu um preço anunciado e é esse que
 * paga. Vencer a primeira cadastrada faria o preço depender da ordem de
 * inserção no banco, que ninguém consegue explicar no balcão.
 */
export function findOffPeakDiscount(
  windows: OffPeakWindow[],
  dateISO: string,
  startTime: string,
  price: number
): OffPeakMatch | null {
  const weekday = weekdayOf(dateISO);
  const slot = toMinutes(startTime);
  if (weekday === null || slot === null) return null;
  if (!Number.isFinite(price) || price <= 0) return null;

  let best: OffPeakWindow | null = null;

  for (const w of windows) {
    if (!w.isActive) continue;
    if (w.weekday !== weekday) continue;
    if (!isValidWindow(w)) continue;

    const start = toMinutes(w.startTime)!;
    const end = toMinutes(w.endTime)!;
    // Fim exclusivo: um slot das 12:00 não entra na janela 09:00–12:00. Sem
    // isso, janelas encostadas (09–12 e 12–15) se sobreporiam num minuto.
    if (slot < start || slot >= end) continue;

    if (!best || w.discountPercentage > best.discountPercentage) best = w;
  }

  if (!best) return null;

  const discountAmount = Math.round(price * (best.discountPercentage / 100) * 100) / 100;
  return {
    window: best,
    discountPercentage: best.discountPercentage,
    discountAmount,
    finalPrice: Math.round((price - discountAmount) * 100) / 100,
  };
}

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// ─── Ocupação e sugestão de janela ──────────────────────────────────────────
//
// A agregação vive em `src/server/queries/occupancy.ts` (SQL). Aqui fica a
// leitura da grade, que é julgamento de produto e precisa de teste.

export type OccupancyCell = {
  weekday: number;
  weekdayLabel: string;
  /** Hora cheia inicial da faixa (ex.: 9 = 09:00–09:59). */
  hour: number;
  bookings: number;
};

export type OccupancyGrid = {
  cells: OccupancyCell[];
  /** Maior contagem da grade — base da escala visual. */
  max: number;
  /** Total no período, para o vazio ser distinguível de "sem dados". */
  total: number;
  daysAnalyzed: number;
};

export type OffPeakSuggestion = {
  weekday: number;
  weekdayLabel: string;
  startHour: number;
  endHour: number;
  bookings: number;
  /** Quantos agendamentos a faixa mais cheia teve no mesmo intervalo de horas. */
  busiestComparable: number;
};

/**
 * Faixas contíguas de baixa ocupação, prontas para virar janela de desconto.
 *
 * "Baixa" é relativo à própria empresa, não a um número absoluto: cinco
 * agendamentos numa terça é vazio para um salão grande e cheio para um
 * profissional autônomo. O corte é uma fração do horário mais movimentado.
 */
export function suggestOffPeakWindows(
  grid: OccupancyGrid,
  opts: { thresholdRatio?: number; minHours?: number } = {}
): OffPeakSuggestion[] {
  const thresholdRatio = opts.thresholdRatio ?? 0.4;
  const minHours = opts.minHours ?? 2;

  // Sem movimento nenhum não há o que sugerir — e sugerir desconto para uma
  // empresa que ainda não tem histórico seria inventar um padrão.
  if (grid.total === 0 || grid.max === 0) return [];

  const threshold = grid.max * thresholdRatio;
  const byWeekday = new Map<number, Map<number, number>>();
  for (const c of grid.cells) {
    if (!byWeekday.has(c.weekday)) byWeekday.set(c.weekday, new Map());
    byWeekday.get(c.weekday)!.set(c.hour, c.bookings);
  }

  const suggestions: OffPeakSuggestion[] = [];

  for (const [weekday, hours] of byWeekday) {
    const present = [...hours.keys()].sort((a, b) => a - b);
    let runStart: number | null = null;
    let runEnd: number | null = null;
    let runTotal = 0;

    const flush = () => {
      if (runStart === null || runEnd === null) return;
      const span = runEnd - runStart + 1;
      if (span < minHours) return;
      suggestions.push({
        weekday,
        weekdayLabel: WEEKDAY_LABELS[weekday] ?? "—",
        startHour: runStart,
        endHour: runEnd + 1,
        bookings: runTotal,
        busiestComparable: grid.max * span,
      });
    };

    for (const hour of present) {
      const count = hours.get(hour) ?? 0;
      const isQuiet = count <= threshold;
      // A sequência só continua se as horas forem contíguas: 9h e 14h calmas
      // não formam uma janela das 9h às 15h.
      const contiguous = runEnd !== null && hour === runEnd + 1;

      if (isQuiet && (runStart === null || contiguous)) {
        if (runStart === null) {
          runStart = hour;
          runTotal = 0;
        }
        runEnd = hour;
        runTotal += count;
        continue;
      }

      flush();
      if (isQuiet) {
        runStart = hour;
        runEnd = hour;
        runTotal = count;
      } else {
        runStart = null;
        runEnd = null;
        runTotal = 0;
      }
    }
    flush();
  }

  return suggestions.sort((a, b) => a.bookings - b.bookings).slice(0, 6);
}
