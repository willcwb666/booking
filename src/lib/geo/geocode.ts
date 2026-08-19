import "server-only";
import { db } from "@/lib/db";
import type { GeoCoordinate } from "./haversine";

/**
 * Endereço → coordenadas.
 *
 * ─── Por que Nominatim e não Google ──────────────────────────────────────────
 *
 * O Geocoding do Google cobra por requisição e exige conta de faturamento
 * ativa. Cobrar do dono da barbearia uma conta de API para que a agenda saiba
 * que dois endereços ficam longe um do outro inverteria a relação de custo do
 * recurso — que é justamente o argumento de fazer a versão barata.
 *
 * O Nominatim (OpenStreetMap) é gratuito e não pede chave. Em troca pede
 * educação, e aqui isso é levado a sério: uma requisição por endereço na vida
 * (o resto sai do cache), no máximo uma por segundo, e um User-Agent que diz
 * quem está chamando. Serviço mantido por voluntários que é usado como se
 * fosse infraestrutura paga acaba bloqueando o chamador — e com razão.
 *
 * ─── Nunca no caminho crítico ────────────────────────────────────────────────
 *
 * Toda falha aqui devolve `null`. Serviço fora do ar, tempo esgotado, endereço
 * que ninguém reconhece: o agendamento continua, a agenda continua, e o que se
 * perde é só o bloqueio de viagem. Um cadastro auxiliar não pode ter poder de
 * veto sobre a venda.
 */

const PROVIDER_URL =
  process.env.GEOCODER_URL ?? "https://nominatim.openstreetmap.org/search";

/**
 * A política de uso do Nominatim exige um User-Agent que identifique a
 * aplicação. Um genérico de biblioteca HTTP é motivo declarado de bloqueio.
 */
const USER_AGENT =
  process.env.GEOCODER_USER_AGENT ??
  `Kreator-Booking/1.0 (${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"})`;

/** Tempo esgotado curto: isto roda depois de um agendamento já gravado. */
const TIMEOUT_MS = Number(process.env.GEOCODER_TIMEOUT_MS ?? 4000);

/** Intervalo mínimo entre duas chamadas ao provedor — a política pede 1/s. */
const MIN_INTERVAL_MS = 1100;

/**
 * Quanto tempo uma falha vale antes de valer a pena perguntar de novo.
 *
 * Endereço novo — loteamento recente, rua recém-nomeada — entra na base do
 * OpenStreetMap com o tempo. Cachear a falha para sempre condenaria esses
 * endereços a nunca funcionar; não cachear reconsultaria a cada agendamento.
 */
const MISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AddressParts = {
  address: string;
  city?: string | null;
  zip?: string | null;
};

/**
 * Chave do cache.
 *
 * Minúsculas e espaços colapsados para que "Rua  XV  de Novembro, 100" e
 * "rua xv de novembro, 100" não gastem duas consultas. Sem o número do
 * apartamento de propósito: apartamento não muda a coordenada do prédio, e
 * incluí-lo multiplicaria as consultas por prédio.
 */
export function normalizeQuery(parts: AddressParts): string {
  return [parts.address, parts.city, parts.zip]
    .filter((p) => p && p.trim().length > 0)
    .join(", ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Fila de um só: garante o intervalo mínimo mesmo com chamadas concorrentes. */
let lastCallAt = 0;
let chain: Promise<unknown> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    return fn();
  });
  // A corrente não pode quebrar quando um elo falha, senão a próxima chamada
  // herda a rejeição de uma consulta que não é dela.
  chain = next.catch(() => undefined);
  return next;
}

type ProviderResult =
  | { outcome: "found"; coords: GeoCoordinate }
  | { outcome: "not_found" }
  /** Erro do nosso lado ou do provedor — NÃO é resposta sobre o endereço. */
  | { outcome: "unavailable" };

async function askProvider(query: string): Promise<ProviderResult> {
  const url = new URL(PROVIDER_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return { outcome: "unavailable" };

    const body = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const first = Array.isArray(body) ? body[0] : undefined;
    if (!first) return { outcome: "not_found" };

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { outcome: "not_found" };
    }
    return { outcome: "found", coords: { latitude, longitude } };
  } catch {
    return { outcome: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve um endereço, usando o cache quando possível.
 *
 * A distinção entre "o provedor disse que não existe" e "o provedor não
 * respondeu" é o ponto delicado: só a primeira vira cache. Gravar uma queda de
 * dois minutos como "endereço inexistente" condenaria aquele endereço a uma
 * semana sem bloqueio de viagem por causa de um soluço de rede.
 */
export async function geocodeAddress(parts: AddressParts): Promise<GeoCoordinate | null> {
  const query = normalizeQuery(parts);
  if (query.length < 5) return null;

  try {
    const cached = await db.geocodeCache.findUnique({ where: { query } });
    if (cached) {
      if (cached.latitude !== null && cached.longitude !== null) {
        return { latitude: cached.latitude, longitude: cached.longitude };
      }
      if (Date.now() - cached.resolvedAt.getTime() < MISS_TTL_MS) return null;
    }
  } catch (err) {
    // Cache indisponível não impede a consulta; só a torna mais cara.
    console.error("[geocode] falha ao ler o cache:", err);
  }

  const result = await serialize(() => askProvider(query));
  if (result.outcome === "unavailable") return null;

  const coords = result.outcome === "found" ? result.coords : null;

  try {
    const data = {
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      provider: new URL(PROVIDER_URL).host,
      resolvedAt: new Date(),
    };
    await db.geocodeCache.upsert({
      where: { query },
      update: data,
      create: { query, ...data },
    });
  } catch (err) {
    console.error("[geocode] falha ao gravar o cache:", err);
  }

  return coords;
}
