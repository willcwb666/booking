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
export function todayInTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
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
export function minutesIntoDayInTimezone(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

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
