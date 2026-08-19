import "server-only";
import { db } from "@/lib/db";
import { deleteR2Object } from "@/lib/r2";

/**
 * Expurgo das fotos com prazo de guarda vencido.
 *
 * ─── Por que existe ──────────────────────────────────────────────────────────
 *
 * Prazo de retenção que ninguém executa é texto de política, não proteção. A
 * empresa que promete guardar por dois anos e guarda para sempre está numa
 * posição pior do que se não tivesse prometido nada — e o acervo é de rosto de
 * pessoa identificada.
 *
 * ─── Arquivo primeiro, registro depois ───────────────────────────────────────
 *
 * A mesma ordem da exclusão manual, pelo mesmo motivo: linha apagada com
 * arquivo de pé é um arquivo que ninguém consegue mais localizar. Se o
 * armazenamento falhar, a foto fica para a próxima passada em vez de virar
 * órfã silenciosa.
 *
 * ─── Por que em lotes ────────────────────────────────────────────────────────
 *
 * Cada exclusão é uma chamada de rede. Uma varredura sem teto, no dia em que um
 * acervo grande vence de uma vez, seguraria a rota do cron até o tempo limite e
 * não apagaria nada — o pior dos dois mundos.
 */
export type PurgeResult = { deleted: number; failed: number };

export async function purgeExpiredClientPhotos(limit = 100): Promise<PurgeResult> {
  const expired = await db.clientPhoto.findMany({
    where: { retainUntil: { lte: new Date() } },
    orderBy: { retainUntil: "asc" },
    take: limit,
    select: { id: true, storageKey: true },
  });

  let deleted = 0;
  let failed = 0;

  for (const photo of expired) {
    try {
      await deleteR2Object(photo.storageKey);
      await db.clientPhoto.delete({ where: { id: photo.id } });
      deleted++;
    } catch (err) {
      console.error("[vault-purge] falha ao expurgar", photo.id, err);
      failed++;
    }
  }

  return { deleted, failed };
}
