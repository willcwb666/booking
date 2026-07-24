import "server-only";
import { createHmac } from "crypto";
import { lookup } from "dns/promises";
import { db } from "./db";

/**
 * Bloqueia SSRF: a URL do webhook é definida pela empresa, então o servidor
 * não pode ser induzido a chamar redes internas (metadata de cloud, localhost,
 * serviços privados). Exige HTTPS e recusa qualquer host que resolva para
 * faixa privada/loopback/link-local.
 *
 * Nota: há uma janela de DNS-rebinding (TOCTOU) entre a resolução e o fetch;
 * a proteção proporcional aqui é exigir HTTPS + bloquear IPs privados. Pinning
 * do IP resolvido seria o passo seguinte se necessário.
 */
function isPrivateIp(ip: string): boolean {
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

async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL de webhook inválida");
  }
  if (url.protocol !== "https:") throw new Error("Webhook exige HTTPS");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error("Host não permitido");
  }
  // Se o host já é um IP literal, valida direto; senão resolve o DNS.
  const resolved = await lookup(host, { all: true });
  for (const r of resolved) {
    if (isPrivateIp(r.address)) throw new Error("Destino aponta para rede interna");
  }
}

export type WebhookEventType =
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_COMPLETED"
  | "BOOKING_RESCHEDULED"
  | "REVIEW_SUBMITTED";

export async function triggerWebhooks(
  companyId: string,
  event: WebhookEventType,
  payload: object
): Promise<void> {
  const webhooks = await db.companyWebhook.findMany({
    where: {
      companyId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) return;

  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });

  await Promise.allSettled(
    webhooks.map((wh) => deliverWebhook(wh.id, wh.url, wh.secret, body))
  );
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  body: string,
  retries = 3
): Promise<void> {
  // Valida o destino antes de qualquer requisição (anti-SSRF)
  try {
    await assertSafeWebhookUrl(url);
  } catch (err) {
    console.error(`[webhooks] URL bloqueada (${url}):`, err instanceof Error ? err.message : err);
    await db.companyWebhook.update({
      where: { id: webhookId },
      data: { lastTriggeredAt: new Date(), lastStatusCode: 0 },
    });
    return;
  }

  const signature = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");

  let lastStatus = 0;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature": signature,
          "X-Attempt": String(attempt + 1),
        },
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });
      lastStatus = res.status;
      if (res.ok) break;
      if (attempt < retries - 1) await delay(1000 * (attempt + 1));
    } catch (err) {
      console.error(`[webhooks] Attempt ${attempt + 1} failed for ${url}:`, err);
      if (attempt < retries - 1) await delay(1000 * (attempt + 1));
    }
  }

  await db.companyWebhook.update({
    where: { id: webhookId },
    data: { lastTriggeredAt: new Date(), lastStatusCode: lastStatus },
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
