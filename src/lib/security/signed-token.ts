import crypto from "crypto";

/**
 * Segredo dos links de check-in.
 *
 * Sem valor padrão de propósito: antes havia um fallback literal no código
 * ("kreator-default-secure-checkin-key-2026"). Se a variável faltasse em
 * produção, qualquer pessoa que lesse o repositório conseguiria assinar um
 * link de check-in válido para qualquer agendamento. Falhar no boot é
 * preferível a rodar com um segredo público.
 */
function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET (ou BETTER_AUTH_SECRET) não configurado — links de check-in não podem ser assinados."
    );
  }
  return secret;
}

/**
 * Gera um token HMAC-SHA256 para links de check-in.
 */
export function generateSignedCheckinToken(
  bookingId: string,
  companyId: string,
  expiresAtTimestamp: number
): string {
  const payload = `${bookingId}:${companyId}:${expiresAtTimestamp}`;
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/**
 * Token de avaliação — permite avaliar sem login.
 *
 * A maioria dos clientes agenda sem criar conta, então exigir sessão para
 * avaliar reduzia o alcance a quase zero. O link assinado no e-mail faz o papel
 * da sessão, do mesmo jeito que já acontece no check-in.
 *
 * O prefixo `review:` no payload é o que impede um token de check-in de valer
 * como token de avaliação e vice-versa: sem ele, os dois recursos assinariam a
 * mesma string com a mesma chave.
 */
export function generateSignedReviewToken(
  bookingId: string,
  companyId: string,
  expiresAtTimestamp: number
): string {
  const payload = `review:${bookingId}:${companyId}:${expiresAtTimestamp}`;
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function verifySignedReviewToken(
  bookingId: string,
  companyId: string,
  token: string,
  expiresAtTimestamp: number
): { valid: boolean; reason?: string } {
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isFinite(expiresAtTimestamp) || now > expiresAtTimestamp) {
    return { valid: false, reason: "Link de avaliação expirado." };
  }

  const expected = generateSignedReviewToken(bookingId, companyId, expiresAtTimestamp);
  return constantTimeEquals(token, expected)
    ? { valid: true }
    : { valid: false, reason: "Link de avaliação inválido." };
}

/**
 * Comparação em tempo constante, tolerante a tamanhos diferentes.
 *
 * `timingSafeEqual` LANÇA quando os buffers têm tamanhos distintos — sem a
 * verificação prévia, um token curto derrubava a request com exceção não
 * tratada em vez de devolver "inválido".
 */
function constantTimeEquals(received: string, expected: string): boolean {
  const a = Buffer.from(received ?? "", "utf-8");
  const b = Buffer.from(expected, "utf-8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Valida autenticidade e prazo do token.
 */
export function verifySignedCheckinToken(
  bookingId: string,
  companyId: string,
  token: string,
  expiresAtTimestamp: number
): { valid: boolean; reason?: string } {
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isFinite(expiresAtTimestamp) || now > expiresAtTimestamp) {
    return { valid: false, reason: "Link de check-in expirado." };
  }

  const expected = generateSignedCheckinToken(bookingId, companyId, expiresAtTimestamp);

  const received = Buffer.from(token ?? "", "utf-8");
  const expectedBuf = Buffer.from(expected, "utf-8");

  // `timingSafeEqual` LANÇA quando os buffers têm tamanhos diferentes — sem
  // esta comparação prévia, um token curto derrubava a request com exceção
  // não tratada em vez de devolver "inválido".
  if (received.length !== expectedBuf.length) {
    return { valid: false, reason: "Token de autenticação inválido." };
  }

  if (!crypto.timingSafeEqual(received, expectedBuf)) {
    return { valid: false, reason: "Token de autenticação inválido." };
  }

  return { valid: true };
}
