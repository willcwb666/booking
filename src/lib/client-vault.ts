/**
 * Cofre do cliente — as regras que não dependem do banco.
 *
 * ─── Por que o cofre existe ──────────────────────────────────────────────────
 *
 * No retorno, o profissional precisa saber exatamente o que fez da última vez:
 * a fórmula da coloração, o volume do oxidante, o número da lâmina. Hoje isso
 * mora num caderno, num grupo de WhatsApp consigo mesmo, ou na memória — e some
 * junto com o profissional quando ele sai.
 *
 * ─── Por que a IA que "lê a foto" não foi construída ─────────────────────────
 *
 * O desenho original pedia uma IA que anotasse a ficha técnica a partir da
 * imagem. Ela não consegue, e não é questão de modelo melhor: a fórmula não
 * está na foto. Está na cabeça de quem aplicou. Nenhuma quantidade de pixels
 * revela que foram 40 gramas de 7.1 com 20 volumes.
 *
 * O que resolve é campo estruturado com sugestão do que aquele profissional já
 * usou antes. Mais rápido de preencher que ditar para uma máquina, e correto
 * por construção em vez de provável.
 */

/**
 * Código do módulo licenciado.
 *
 * Mora aqui e não na action porque arquivo `use server` só pode exportar
 * função async — o Next recusa o build, e o teste estático de superfície pega
 * antes disso.
 */
export const VAULT_MODULE = "cofre_do_cliente";

export type PhotoKind = "BEFORE" | "AFTER";

export const PHOTO_KINDS: readonly PhotoKind[] = ["BEFORE", "AFTER"];

export function isPhotoKind(value: string): value is PhotoKind {
  return (PHOTO_KINDS as readonly string[]).includes(value);
}

/**
 * Até quando a foto pode ser guardada.
 *
 * O prazo é contado da data em que a foto entra, não da última visita do
 * cliente: renovar o relógio a cada retorno faria o acervo de quem é fiel nunca
 * expirar, que é exatamente o acervo mais sensível.
 *
 * Meses e não dias porque é assim que a conversa acontece — "guardamos por dois
 * anos" —, e somar meses no calendário evita a deriva de aproximar mês por 30
 * dias, que ao longo de dois anos erra em mais de duas semanas.
 */
export function computeRetainUntil(from: Date, months: number): Date {
  const safeMonths = Math.max(1, Math.floor(months));
  const target = new Date(from.getTime());
  const day = target.getUTCDate();

  target.setUTCMonth(target.getUTCMonth() + safeMonths);

  // 31 de janeiro + 1 mês vira 3 de março no JavaScript, porque fevereiro não
  // tem dia 31. Voltar para o último dia do mês anterior mantém a promessa de
  // "um mês" em vez de esticá-la em silêncio.
  if (target.getUTCDate() < day) target.setUTCDate(0);

  return target;
}

/** Fotos cujo prazo de guarda venceu — as elegíveis a expurgo. */
export function isRetentionExpired(retainUntil: Date, now: Date): boolean {
  return retainUntil.getTime() <= now.getTime();
}

/**
 * Sugestões de preenchimento a partir do que já foi usado antes.
 *
 * Ordena por uso mais recente, não por frequência. O profissional que mudou a
 * fórmula do cliente no mês passado quer a nova no topo, e a antiga — usada
 * cinco vezes ao longo de dois anos — venceria qualquer ranking por contagem.
 *
 * Comparação sem diferenciar maiúsculas e acentos de espaçamento porque
 * "7.1 + 9.3" e "7.1 +  9.3" são a mesma fórmula digitada duas vezes, e uma
 * lista que mostra as duas ensina o profissional a ignorá-la.
 */
export function buildSuggestions(
  values: Array<string | null | undefined>,
  limit = 8
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const value = raw?.trim();
    if (!value) continue;

    const key = value.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }

  return out;
}

export type ServiceRecordFields = {
  formula?: string | null;
  developer?: string | null;
  processingMinutes?: number | null;
  clipperGuard?: string | null;
  productsUsed?: string | null;
  notes?: string | null;
};

/**
 * A ficha está vazia?
 *
 * Salvar uma ficha em branco cria um registro que, no retorno, diz "houve uma
 * sessão e não anotamos nada" — indistinguível de "houve uma sessão e nada foi
 * feito". Melhor não gravar e deixar o campo pedindo para ser preenchido.
 */
export function isServiceRecordEmpty(fields: ServiceRecordFields): boolean {
  return (
    !fields.formula?.trim() &&
    !fields.developer?.trim() &&
    !fields.clipperGuard?.trim() &&
    !fields.productsUsed?.trim() &&
    !fields.notes?.trim() &&
    (fields.processingMinutes === null ||
      fields.processingMinutes === undefined ||
      fields.processingMinutes <= 0)
  );
}
