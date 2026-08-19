import "server-only";
import { createHmac } from "crypto";
import { db } from "./db";
import { assertPublicHttpsUrl } from "./ssrf";

// A URL do webhook é definida pela empresa; a validação anti-SSRF (HTTPS +
// bloqueio de rede interna) vive em @/lib/ssrf e é compartilhada com o iCal.
const assertSafeWebhookUrl = assertPublicHttpsUrl;

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
