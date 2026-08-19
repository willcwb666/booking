/**
 * Modelo de período compartilhado pelos três painéis (plataforma, empresa e
 * cliente).
 *
 * Duas decisões que valem para todos eles:
 *
 *  · O período mora na URL, não no estado do React. Assim o recorte é
 *    compartilhável, sobrevive ao F5 e pode ser resolvido no servidor — que é
 *    onde a agregação precisa acontecer.
 *
 *  · Todo recorte carrega junto o período imediatamente anterior de mesmo
 *    tamanho. Número sozinho não informa: "R$ 12.400" só quer dizer alguma
 *    coisa ao lado de "R$ 9.800 nos 30 dias anteriores".
 *
 * As datas são strings `YYYY-MM-DD`. `Booking.scheduledDate` é gravado assim,
 * então a comparação lexicográfica bate com a cronológica e o índice
 * `(companyId, scheduledDate)` é usado direto, sem cast.
 */

export type RangeKey = "7d" | "30d" | "90d" | "12m" | "custom";
export type Granularity = "day" | "week" | "month";

export type AnalyticsRange = {
  key: RangeKey;
  /** Início do recorte, inclusivo. `YYYY-MM-DD` */
  from: string;
  /** Fim do recorte, inclusivo. `YYYY-MM-DD` */
  to: string;
  /** Período anterior de mesmo tamanho, para comparação. */
  prevFrom: string;
  prevTo: string;
  granularity: Granularity;
  /** Quantidade de dias no recorte (inclusivo nas duas pontas). */
  days: number;
  /** Rótulo curto para cabeçalho e legenda. */
  label: string;
};

export const RANGE_PRESETS: { key: Exclude<RangeKey, "custom">; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "12m", label: "12 meses" },
];

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mês",
};

/** Teto de segurança: uma consulta agregada não deve varrer mais que isto. */
const MAX_RANGE_DAYS = 731;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonthsISO(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const targetDay = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  // Preserva o dia sem transbordar (31 de janeiro − 1 mês = 28/29 de fevereiro)
  const lastDayOfTarget = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(targetDay, lastDayOfTarget));
  return d.toISOString().slice(0, 10);
}

export function diffDaysISO(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function isValidISO(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const t = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(t);
}

/**
 * Granularidade automática: o objetivo é manter o gráfico entre ~7 e ~60
 * pontos. Menos que isso vira um traço reto; mais vira serrilha ilegível.
 */
export function autoGranularity(days: number): Granularity {
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  return "month";
}

export type RangeSearchParams = {
  range?: string;
  from?: string;
  to?: string;
  g?: string;
};

export function resolveRange(params: RangeSearchParams = {}): AnalyticsRange {
  const today = todayISO();

  let key: RangeKey =
    params.range === "7d" ||
    params.range === "30d" ||
    params.range === "90d" ||
    params.range === "12m" ||
    params.range === "custom"
      ? params.range
      : "30d";

  let from: string;
  let to: string;

  if (key === "custom" && isValidISO(params.from) && isValidISO(params.to)) {
    from = params.from;
    to = params.to;
    if (from > to) [from, to] = [to, from];
    if (diffDaysISO(from, to) + 1 > MAX_RANGE_DAYS) {
      from = addDaysISO(to, -(MAX_RANGE_DAYS - 1));
    }
  } else {
    // Recorte inválido ou incompleto cai no padrão em vez de quebrar a página.
    if (key === "custom") key = "30d";
    to = today;
    from =
      key === "7d"
        ? addDaysISO(today, -6)
        : key === "30d"
          ? addDaysISO(today, -29)
          : key === "90d"
            ? addDaysISO(today, -89)
            : addDaysISO(addMonthsISO(today, -12), 1);
  }

  const days = diffDaysISO(from, to) + 1;

  const granularity: Granularity =
    params.g === "day" || params.g === "week" || params.g === "month"
      ? params.g
      : autoGranularity(days);

  return {
    key,
    from,
    to,
    prevTo: addDaysISO(from, -1),
    prevFrom: addDaysISO(from, -days),
    granularity,
    days,
    label:
      key === "custom"
        ? `${formatShort(from)} – ${formatShort(to)}`
        : (RANGE_PRESETS.find((p) => p.key === key)?.label ?? `${days} dias`),
  };
}

function formatShort(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** Monta a query string preservando o recorte atual e aplicando um ajuste. */
export function rangeQuery(
  range: AnalyticsRange,
  patch: Partial<Pick<AnalyticsRange, "key" | "from" | "to" | "granularity">> = {}
): string {
  const key = patch.key ?? range.key;
  const sp = new URLSearchParams();
  sp.set("range", key);
  if (key === "custom") {
    sp.set("from", patch.from ?? range.from);
    sp.set("to", patch.to ?? range.to);
  }
  const g = patch.granularity ?? range.granularity;
  // Só grava a granularidade quando difere do automático — URL limpa por padrão.
  const days =
    key === "custom"
      ? diffDaysISO(patch.from ?? range.from, patch.to ?? range.to) + 1
      : range.days;
  if (g !== autoGranularity(days)) sp.set("g", g);
  return `?${sp.toString()}`;
}

/**
 * Gera todos os rótulos de bucket do recorte, inclusive os vazios.
 *
 * Isto não é detalhe: sem os buckets vazios o gráfico liga o ponto de segunda
 * direto no de quinta e desenha uma reta onde não houve movimento nenhum —
 * um dia sem vendas some em vez de aparecer como zero.
 */
export function enumerateBuckets(range: AnalyticsRange): string[] {
  const out: string[] = [];

  if (range.granularity === "month") {
    let cursor = `${range.from.slice(0, 7)}-01`;
    const last = `${range.to.slice(0, 7)}-01`;
    while (cursor <= last) {
      out.push(cursor);
      cursor = addMonthsISO(cursor, 1);
    }
    return out;
  }

  if (range.granularity === "week") {
    let cursor = startOfWeekISO(range.from);
    const last = startOfWeekISO(range.to);
    while (cursor <= last) {
      out.push(cursor);
      cursor = addDaysISO(cursor, 7);
    }
    return out;
  }

  let cursor = range.from;
  while (cursor <= range.to) {
    out.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return out;
}

/** Segunda-feira da semana da data — mesma convenção do `date_trunc('week')`. */
export function startOfWeekISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = segunda
  return addDaysISO(iso, -dow);
}

/** Rótulo curto do eixo X, conforme a granularidade. */
export function bucketLabel(bucket: string, granularity: Granularity): string {
  if (granularity === "month") {
    const months = [
      "jan", "fev", "mar", "abr", "mai", "jun",
      "jul", "ago", "set", "out", "nov", "dez",
    ];
    return `${months[Number(bucket.slice(5, 7)) - 1]}/${bucket.slice(2, 4)}`;
  }
  return formatShort(bucket);
}

/**
 * Variação percentual contra o período anterior.
 *
 * Devolve `null` quando a base é zero — "subiu 100%" partindo de zero não
 * significa nada e é exatamente o tipo de número inflado que faz um painel
 * perder credibilidade.
 */
export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
