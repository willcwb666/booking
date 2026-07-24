import "server-only";
import { createHmac } from "crypto";

/**
 * Token HMAC que autoriza o download público do .ics de um booking
 * sem expor os dados a quem só conhece o ID.
 */
export function generateIcsToken(bookingId: string): string {
  // Chave dedicada quando disponível; fallback mantém tokens já emitidos válidos
  const secret = process.env.ICS_TOKEN_SECRET ?? process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("ICS_TOKEN_SECRET ou ENCRYPTION_KEY não configurada");
  return createHmac("sha256", secret).update(`ics:${bookingId}`).digest("hex").slice(0, 32);
}
