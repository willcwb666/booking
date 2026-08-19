/**
 * Meta individual e ranking da equipe — as regras puras.
 *
 * ─── A comparação que motiva ─────────────────────────────────────────────────
 *
 * O painel compara o profissional com a META DELE, não com o colega. É a
 * diferença entre "faltam 60 para você fechar o dia" e "você está em quarto
 * lugar": a primeira é acionável às 15h, a segunda só informa a alguém que já
 * sabe. Metade de uma equipe está sempre na metade de baixo de um ranking, e
 * essa metade não trabalha melhor por saber disso.
 *
 * ─── Por que o ranking existe mesmo assim, e desligado ───────────────────────
 *
 * Há operações em que ele funciona — equipes pequenas, cultura já competitiva,
 * dono presente. Só que decidir isso é gestão, não software. A chave fica com o
 * dono, e o padrão é desligado, porque o padrão é o que a maioria vai ficar.
 */

export type GoalProgress = {
  /** Meta do dia. Nulo quando não há meta definida. */
  goal: number | null;
  achieved: number;
  /**
   * Percentual atingido, sem teto. 140% de meta é informação; cortar em 100
   * esconderia justamente o dia excepcional.
   *
   * Nulo quando não há meta — e nulo não é zero: "não tenho meta" e "não vendi
   * nada" não podem parecer a mesma coisa numa tela.
   */
  percent: number | null;
  /** Quanto falta. Nunca negativo, e nulo sem meta. */
  remaining: number | null;
  reached: boolean;
};

export function computeGoalProgress(achieved: number, goal: unknown): GoalProgress {
  const safeAchieved = Number.isFinite(achieved) && achieved > 0 ? achieved : 0;
  const parsed = Number(goal);
  const hasGoal = Number.isFinite(parsed) && parsed > 0;

  if (!hasGoal) {
    return { goal: null, achieved: safeAchieved, percent: null, remaining: null, reached: false };
  }

  return {
    goal: parsed,
    achieved: safeAchieved,
    percent: (safeAchieved / parsed) * 100,
    remaining: Math.max(0, parsed - safeAchieved),
    reached: safeAchieved >= parsed,
  };
}

/** Largura da barra: o percentual com teto, só para desenhar. */
export function progressBarWidth(percent: number | null): number {
  if (percent === null || !Number.isFinite(percent) || percent <= 0) return 0;
  return Math.min(100, percent);
}

export type RankEntry = {
  professionalId: string;
  name: string;
  revenue: number;
};

export type RankedEntry = RankEntry & {
  /** 1 é o primeiro. Empate divide a mesma posição. */
  position: number;
};

/**
 * Ordena a equipe por faturamento.
 *
 * Empate divide a posição em vez de ser desempatado por ordem alfabética ou
 * por id: dois profissionais com o mesmo número não estão em primeiro e
 * segundo, estão empatados, e inventar uma ordem entre eles é criar uma derrota
 * que não existe. A posição seguinte pula, como em competição.
 */
export function rankTeam(entries: RankEntry[]): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue;
    return a.name.localeCompare(b.name);
  });

  const out: RankedEntry[] = [];
  let position = 0;
  let previousRevenue: number | null = null;

  sorted.forEach((entry, index) => {
    if (previousRevenue === null || entry.revenue !== previousRevenue) {
      position = index + 1;
      previousRevenue = entry.revenue;
    }
    out.push({ ...entry, position });
  });

  return out;
}

/**
 * Projeção simples do fechamento do dia.
 *
 * Regra de três sobre a fração de expediente já decorrida. Não é previsão: é o
 * "neste ritmo" que o profissional faria de cabeça, e serve para responder
 * "dá tempo?" enquanto ainda dá.
 *
 * Devolve nulo antes de o expediente começar e depois que ele termina —
 * projetar o dia inteiro a partir dos primeiros cinco minutos produz números
 * absurdos, e depois do fim não há mais o que projetar.
 */
export function projectDayTotal(params: {
  achieved: number;
  minutesElapsed: number;
  minutesTotal: number;
}): number | null {
  const { achieved, minutesElapsed, minutesTotal } = params;
  if (minutesTotal <= 0) return null;
  // Um oitavo do expediente é o mínimo para a regra de três dizer algo.
  if (minutesElapsed < minutesTotal / 8) return null;
  if (minutesElapsed >= minutesTotal) return null;

  return (achieved / minutesElapsed) * minutesTotal;
}
