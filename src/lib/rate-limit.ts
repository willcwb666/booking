import "server-only";
import { redis } from "./redis";

/**
 * Rate limiting de janela fixa sobre Redis, com fallback em memória.
 *
 * As políticas ficam TODAS em `RATE_LIMITS` — antes cada call site inventava
 * seus próprios números soltos, o que tornava impossível auditar a superfície.
 * Para adicionar um limite novo, declare a política aqui e chame
 * `enforceRateLimit`.
 */

/**
 * O que fazer quando o Redis está indisponível:
 *  - `memory`: aplica um limitador por instância. Padrão para tudo que protege
 *    dinheiro, credenciais ou recursos caros — degrada, mas não abre a porta.
 *  - `open`: libera. Só para endpoints onde o abuso é irrelevante e bloquear
 *    causaria mais dano que o abuso.
 */
type FailMode = "memory" | "open";

export type RateLimitPolicy = {
  /** Prefixo da chave — precisa ser único por política. */
  readonly name: string;
  readonly limit: number;
  readonly windowSeconds: number;
  readonly failMode: FailMode;
  /** Mensagem exibida ao usuário quando estoura. */
  readonly message: string;
};

const TOO_MANY = "Muitas tentativas. Aguarde um momento e tente novamente.";

export const RATE_LIMITS = {
  // ─── Credenciais ───
  /** Login, cadastro, recuperação de senha. Por IP. */
  AUTH: { name: "auth", limit: 5, windowSeconds: 60, failMode: "memory", message: "Muitas tentativas de autenticação. Aguarde 60 segundos." },

  // ─── Agendamento (público, sem login) ───
  BOOKING_CREATE: { name: "booking:create", limit: 10, windowSeconds: 60, failMode: "memory", message: TOO_MANY },
  BOOKING_MOBILE: { name: "booking:mobile", limit: 10, windowSeconds: 60, failMode: "memory", message: TOO_MANY },
  PIX_CHECK: { name: "pix:check", limit: 30, windowSeconds: 60, failMode: "open", message: TOO_MANY },
  ESTIMATE_UPSERT: { name: "estimate:upsert", limit: 30, windowSeconds: 60, failMode: "memory", message: TOO_MANY },
  ESTIMATE_SUBMIT: { name: "estimate:submit", limit: 10, windowSeconds: 60, failMode: "memory", message: TOO_MANY },
  WAITLIST_JOIN: { name: "waitlist:join", limit: 5, windowSeconds: 60, failMode: "memory", message: TOO_MANY },

  // ─── Códigos e cupons: alvo clássico de força bruta ───
  GIFTCARD_VALIDATE: { name: "giftcard:validate", limit: 10, windowSeconds: 60, failMode: "memory", message: "Muitas tentativas de validação. Aguarde um momento." },
  MEMBERSHIP_COVERAGE: { name: "membership:coverage", limit: 20, windowSeconds: 60, failMode: "memory", message: TOO_MANY },
  /** Feed .ics protegido por token: impede varredura do token por empresa. */
  ICS_FEED: { name: "ics:feed", limit: 30, windowSeconds: 60, failMode: "memory", message: TOO_MANY },
  /**
   * Check-in do cliente, autorizado por token assinado na URL. O token e o
   * unico segredo em jogo: sem limite, da para varrer bookingId ate acertar.
   */
  CHECKIN: { name: "checkin", limit: 20, windowSeconds: 60, failMode: "memory", message: TOO_MANY },

  // ─── Leitura publica de dados da empresa ───
  /**
   * Configuracao exibida na pagina publica (aparencia, meios de pagamento,
   * regras de fidelidade). Nao e segredo, mas e consulta ao banco por slug:
   * sem limite, vira ferramenta de enumeracao e de carga.
   */
  PUBLIC_COMPANY_INFO: { name: "public:company", limit: 60, windowSeconds: 60, failMode: "open", message: TOO_MANY },

  // ─── Operações financeiras do painel ───
  /** Venda no PDV: escrita financeira + baixa de estoque. Por usuário. */
  POS_SALE: { name: "pos:sale", limit: 30, windowSeconds: 60, failMode: "memory", message: "Muitas vendas em sequência. Aguarde alguns segundos." },
  /** Ajuste manual de estoque. Por usuário. */
  STOCK_ADJUST: { name: "stock:adjust", limit: 60, windowSeconds: 60, failMode: "memory", message: TOO_MANY },
  /** Estorno: irreversível e mexe no gateway. */
  REFUND: { name: "booking:refund", limit: 10, windowSeconds: 300, failMode: "memory", message: "Muitos estornos em sequência. Aguarde alguns minutos." },

  // ─── Chamadas que saem do nosso servidor (custo + risco de SSRF/abuso) ───
  /** Sincronização com Google Calendar / feed iCal externo. Por empresa. */
  CALENDAR_SYNC: { name: "calendar:sync", limit: 6, windowSeconds: 300, failMode: "memory", message: "Sincronização já executada há pouco. Aguarde alguns minutos." },
  /** Alterar/registrar a URL do feed iCal (resolve DNS e baixa o feed). */
  CALENDAR_FEED_UPDATE: { name: "calendar:feed", limit: 10, windowSeconds: 600, failMode: "memory", message: TOO_MANY },
  // `WEBHOOK_TEST` foi removida: não existe ação de teste manual de webhook no
  // projeto. Política declarada sem operação correspondente dá a impressão de
  // cobertura numa revisão de segurança e não protege nada.
  /**
   * Chamada a modelo de linguagem (Gemini/Groq). Cada requisição custa dinheiro
   * de verdade, então a proteção aqui é orçamentária, não só de abuso: sem
   * limite, um laço num endpoint aberto vira fatura.
   */
  AI_QUERY: { name: "ai:query", limit: 20, windowSeconds: 300, failMode: "memory", message: "Muitas consultas de IA seguidas. Aguarde alguns minutos." },

  // ─── Uploads e envios em massa ───
  UPLOAD: { name: "upload", limit: 10, windowSeconds: 60, failMode: "memory", message: TOO_MANY },
  PROMO_SEND: { name: "promo:send", limit: 2, windowSeconds: 3600, failMode: "memory", message: "Limite de envios de campanha atingido nesta hora." },
  REVIEW: { name: "review", limit: 5, windowSeconds: 60, failMode: "open", message: TOO_MANY },
  /** Exportação de CSV com dados de clientes. Por usuário. */
  EXPORT: { name: "export", limit: 10, windowSeconds: 300, failMode: "memory", message: TOO_MANY },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  limit: number;
  message: string;
  /** Redis fora e o veredito veio do limitador em memória. */
  degraded: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Fallback em memória (por instância)
// ─────────────────────────────────────────────────────────────────────────────

const memoryHits = new Map<string, number[]>();
const MEMORY_MAX_KEYS = 10_000;

function memoryAllowed(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const recent = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  memoryHits.set(key, recent);

  // Limpeza oportunista — o Map não pode crescer sem teto
  if (memoryHits.size > MEMORY_MAX_KEYS) {
    for (const [k, hits] of memoryHits) {
      if (hits.every((t) => now - t >= windowMs)) memoryHits.delete(k);
    }
    if (memoryHits.size > MEMORY_MAX_KEYS) memoryHits.clear();
  }

  return recent.length <= limit;
}

// ─────────────────────────────────────────────────────────────────────────────
// Motor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica uma política de rate limit a uma identidade (IP, userId, companyId).
 * A chave final é `rl:<policy>:<identity>`.
 */
export async function enforceRateLimit(
  policy: RateLimitPolicy,
  identity: string
): Promise<RateLimitResult> {
  const key = `rl:${policy.name}:${identity}`;

  try {
    // INCR + EXPIRE num pipeline: uma ida ao Redis em vez de três.
    const [incrResult, ttlResult] = (await redis
      .multi()
      .incr(key)
      .ttl(key)
      .exec()) as Array<[Error | null, number]>;

    const current = Number(incrResult?.[1] ?? 0);
    let ttl = Number(ttlResult?.[1] ?? -1);

    // TTL ausente (-1) significa chave nova ou órfã: sempre re-arma a janela,
    // senão um contador sem expiração bloquearia a chave para sempre.
    if (ttl < 0) {
      await redis.expire(key, policy.windowSeconds);
      ttl = policy.windowSeconds;
    }

    return {
      allowed: current <= policy.limit,
      remaining: Math.max(0, policy.limit - current),
      resetInSeconds: ttl,
      limit: policy.limit,
      message: policy.message,
      degraded: false,
    };
  } catch {
    console.error(`[rate-limit] Redis indisponível — política "${policy.name}" em modo ${policy.failMode}`);

    const allowed =
      policy.failMode === "open"
        ? true
        : memoryAllowed(key, policy.limit, policy.windowSeconds);

    return {
      allowed,
      remaining: 0,
      resetInSeconds: policy.windowSeconds,
      limit: policy.limit,
      message: policy.message,
      degraded: true,
    };
  }
}

/** Resposta 429 padronizada, com `Retry-After` para clientes bem-comportados. */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: result.message, resetInSeconds: result.resetInSeconds }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.resetInSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

/**
 * Compatibilidade com os call sites antigos (`rateLimit(key, limit, window)`).
 * Novo código deve usar `enforceRateLimit` com uma política de `RATE_LIMITS`.
 *
 * @deprecated
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number; degraded?: boolean }> {
  return enforceRateLimit(
    { name: "legacy", limit, windowSeconds, failMode: "memory", message: TOO_MANY },
    key
  );
}

/**
 * IP do cliente. Confia apenas no PRIMEIRO valor de `x-forwarded-for`, que é o
 * que o proxy reverso da borda anexa — os demais são controlados pelo cliente.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Mesma leitura de IP, a partir dos headers de uma Server Action. */
export function getClientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
