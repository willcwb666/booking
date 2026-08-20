/**
 * Quanto tempo o atendimento realmente leva, e onde ele cabe na grade.
 *
 * ─── O defeito que isto corrige ──────────────────────────────────────────────
 *
 * O checkout gravava como fim do atendimento o fim do SLOT DA GRADE. Um
 * orçamento de corte + barba + hidratação, 90 minutos, numa agenda de 30
 * minutos, ocupava um slot só — e os dois seguintes continuavam à venda.
 *
 * Na prática: o profissional estava na metade do primeiro cliente quando o
 * segundo chegava, marcado por um sistema que dizia que o horário estava livre.
 * O dono descobre isso na recepção, com os dois clientes na frente dele.
 *
 * ─── Por que slots inteiros ──────────────────────────────────────────────────
 *
 * A grade é a unidade em que a empresa vende. Um atendimento de 45 minutos numa
 * grade de 30 ocupa DOIS slots, não um e meio: os 15 minutos restantes não são
 * vendáveis para ninguém, e fingir que são é o mesmo defeito em escala menor.
 * A empresa que quiser vender esses 15 minutos muda o intervalo da grade — que
 * é uma decisão dela, explícita, e não um arredondamento nosso.
 */

export type DurationItem = {
  estimatedMinutes: number;
  quantity?: number;
};

/**
 * Duração total de um orçamento: serviços vezes quantidade, mais os extras.
 *
 * Quantidade importa: "duas escovas" é o dobro do tempo, e é assim que a mãe
 * agenda para as duas filhas na mesma ida.
 */
export function totalServiceMinutes(items: DurationItem[]): number {
  return items.reduce((acc, item) => {
    const minutes = Number(item.estimatedMinutes);
    const qty = Number(item.quantity ?? 1);
    if (!Number.isFinite(minutes) || minutes <= 0) return acc;
    if (!Number.isFinite(qty) || qty <= 0) return acc;
    return acc + minutes * qty;
  }, 0);
}

/**
 * Quantos slots consecutivos o atendimento ocupa.
 *
 * Nunca menos que um: um serviço sem duração cadastrada ainda ocupa a cadeira.
 */
export function slotsNeeded(totalMinutes: number, intervalMinutes: number): number {
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) return 1;
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return 1;
  return Math.max(1, Math.ceil(totalMinutes / intervalMinutes));
}

export type Slot = {
  date: string;
  startTime: string;
  endTime: string;
};

/**
 * Os slots que podem INICIAR um atendimento de `count` slots.
 *
 * Um horário só entra na lista se ele e os seguintes formarem uma corrida
 * contígua — o fim de um encostando no começo do próximo. Sem a checagem de
 * contiguidade, um buraco no meio da tarde (almoço, bloqueio, agendamento já
 * existente) seria atravessado como se não estivesse lá, e o cliente compraria
 * um horário que passa por cima de outro compromisso.
 *
 * A lista devolvida é sempre um subconjunto da recebida: nenhum horário novo é
 * inventado aqui.
 */
export function startableSlots<T extends Slot>(slots: T[], count: number): T[] {
  if (count <= 1) return slots;

  const ordered = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const out: T[] = [];

  for (let i = 0; i + count <= ordered.length; i++) {
    let contiguous = true;
    for (let k = 0; k < count - 1; k++) {
      const current = ordered[i + k];
      const next = ordered[i + k + 1];
      if (current.date !== next.date || current.endTime !== next.startTime) {
        contiguous = false;
        break;
      }
    }
    if (contiguous) out.push(ordered[i]);
  }

  return out;
}

/**
 * A corrida de slots que o atendimento vai ocupar, a partir de um início.
 *
 * Devolve lista vazia quando a corrida não fecha — e o chamador precisa tratar
 * isso como "horário indisponível", nunca como "reserva o que der". Meia
 * reserva é o pior estado possível: o cliente sai achando que marcou, e a
 * segunda metade do tempo continua vendida para outro.
 */
export function slotRunFrom<T extends Slot>(slots: T[], startTime: string, count: number): T[] {
  const ordered = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const startIndex = ordered.findIndex((s) => s.startTime === startTime);
  if (startIndex === -1) return [];

  const run = ordered.slice(startIndex, startIndex + count);
  if (run.length !== count) return [];

  for (let k = 0; k < run.length - 1; k++) {
    if (run[k].date !== run[k + 1].date || run[k].endTime !== run[k + 1].startTime) return [];
  }

  return run;
}
