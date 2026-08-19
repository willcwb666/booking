import "server-only";
import { lookup } from "dns/promises";

/**
 * Proteção anti-SSRF para URLs fornecidas por usuários (webhooks, feeds iCal).
 * Exige HTTPS e recusa hosts que resolvam para faixas privadas/loopback/
 * link-local/metadata de cloud.
 *
 * Nota: há uma janela de DNS-rebinding (TOCTOU) entre a resolução e o fetch;
 * a proteção proporcional é exigir HTTPS + bloquear IPs privados. Pinning do
 * IP resolvido seria o passo seguinte se necessário.
 */
export function isPrivateIp(ip: string): boolean {
  const v4 = ip.split(".");
  if (v4.length === 4) {
    const [a, b] = v4.map(Number);
    if ([a, b].some((n) => Number.isNaN(n))) return true; // formato estranho → bloqueia
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reservado
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7)); // IPv4-mapped
  return false;
}

/**
 * Valida que `rawUrl` é HTTPS e não aponta para rede interna. Lança em caso
 * inválido. Use antes de qualquer fetch de URL controlada pelo usuário.
 */
export async function assertPublicHttpsUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL inválida");
  }
  if (url.protocol !== "https:") throw new Error("A URL exige HTTPS");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error("Host não permitido");
  }
  const resolved = await lookup(host, { all: true });
  for (const r of resolved) {
    if (isPrivateIp(r.address)) throw new Error("Destino aponta para rede interna");
  }
}
