/**
 * "Hoje" do ponto de vista da empresa.
 *
 * ─── Por que não `new Date().toISOString()` ──────────────────────────────────
 *
 * O servidor roda em UTC. Um salão em Denver que fecha às 20h local ainda está
 * no dia anterior quando o servidor já virou — às 18h de Denver o UTC já é o
 * dia seguinte. Somar o faturamento "de hoje" em UTC daria zero para a tarde
 * inteira do dono, e ele veria a meta do dia zerar no meio do expediente.
 *
 * O usuário deste produto mora no Colorado e opera nos dois mercados, então
 * isto não é hipotético.
 *
 * ─── Por que `en-CA` ─────────────────────────────────────────────────────────
 *
 * É o locale que formata data como `YYYY-MM-DD`, exatamente o formato em que as
 * datas de agendamento são gravadas. Qualquer outro exigiria remontar a string
 * a partir das partes, que é onde a troca de mês por dia costuma acontecer.
 */
export function todayInTimezone(timezone: string, now: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
  } catch {
    // Fuso inválido no cadastro não pode derrubar a tela. Cair para UTC mostra
    // um dia possivelmente errado; lançar não mostraria dia nenhum.
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Minutos decorridos do dia, no fuso da empresa.
 *
 * Usado para projetar o fechamento — "neste ritmo, você fecha em X". Precisa do
 * mesmo fuso do dia, senão a projeção compara o faturamento de hoje com a hora
 * de outro lugar.
 */
export function minutesIntoDayInTimezone(timezone: string, now: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
    // 24:00 aparece em alguns ambientes como a meia-noite do dia seguinte.
    return (hour % 24) * 60 + minute;
  } catch {
    const now = new Date();
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}


/**
 * O horário do slot já passou, do ponto de vista da empresa?
 *
 * ─── O defeito que isto substitui ────────────────────────────────────────────
 *
 * A grade de disponibilidade decidia isso com DUAS fontes de tempo diferentes,
 * comparadas entre si:
 *
 *     const today = new Date().toISOString().split("T")[0];       // UTC
 *     const currentTime = `${now.getHours()}:${now.getMinutes()}`; // local
 *     if (date === today && slot.startTime <= currentTime) …
 *
 * Às 21h de Denver o UTC já virou: `today` valia AMANHÃ, enquanto
 * `currentTime` continuava sendo 21:00 de hoje. O filtro então rodava sobre a
 * grade de amanhã e escondia tudo antes das 21h — a manhã e a tarde do dia
 * seguinte sumiam da página pública. Toda noite, em qualquer fuso negativo.
 *
 * `now` é injetável para o teste poder fixar o instante: um defeito que só
 * aparece em certa hora do dia não pode ser testado com o relógio real.
 */
export function slotAlreadyPassed(params: {
  /** Data do slot, "YYYY-MM-DD". */
  slotDate: string;
  /** Início do slot, "HH:MM". */
  slotStartTime: string;
  timezone: string;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  // Só faz sentido comparar hora quando a data é a de hoje NA EMPRESA. Em
  // qualquer outro dia, passado ou futuro, a hora do relógio é irrelevante.
  if (params.slotDate !== todayInTimezone(params.timezone, now)) return false;

  const [h, m] = params.slotStartTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  return h * 60 + m <= minutesIntoDayInTimezone(params.timezone, now);
}
