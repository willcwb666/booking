import "server-only";
import { db } from "@/lib/db";

/**
 * Presets de serviço por ramo, cadastrados pelo super admin.
 *
 * ─── O que este arquivo era, e por que mudou ─────────────────────────────────
 *
 * Cada função aqui tinha DUAS implementações: uma via Prisma e, logo abaixo,
 * um fallback em SQL montado por concatenação de string. O fallback existia de
 * uma época em que o model `SystemPreset` ainda não estava no schema, e o
 * `if ((db as any).systemPreset?.update)` era o desvio entre os dois caminhos.
 *
 * O model existe desde então. O desvio, portanto, sempre escolhia o Prisma, e
 * todo o SQL abaixo dele era inalcançável — mas continuava sendo mantido, lido
 * e copiado. E carregava furos reais:
 *
 *   DELETE FROM "system_preset" WHERE id = '${id}'
 *
 * sem escape nenhum no `id`. Um id vindo de formulário fecharia a aspa e
 * escreveria o resto do comando. As funções de `update` e `toggle` tinham o
 * mesmo `WHERE id = '${id}'`, e o `create` interpolava `businessType` e os três
 * campos numéricos crus.
 *
 * Nada disso era explorável enquanto o desvio existisse. Mas código morto que
 * só está seguro por causa de um `if` é uma bomba com o pino preso por fita:
 * basta alguém "simplificar" a condição um dia. A correção não é escapar
 * melhor — é apagar a segunda implementação.
 *
 * ─── O DDL também saiu ───────────────────────────────────────────────────────
 *
 * Havia um `CREATE TABLE IF NOT EXISTS` rodando antes de cada operação. É a
 * mesma coisa que já foi removida do log de auditoria nesta base: DDL em
 * caminho de leitura, pegando lock de tabela, para criar algo que a migration
 * já criou. A tabela nasce em `prisma/migrations`, como todas as outras.
 */

export type SystemPresetRecord = {
  id: string;
  businessType: string;
  title: string;
  description: string | null;
  defaultPrice: number;
  durationMin: number;
  isExtra: boolean;
  parentTitle: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PresetRow = {
  id: string;
  businessType: string;
  title: string;
  description: string | null;
  defaultPrice: unknown;
  durationMin: number;
  isExtra: boolean;
  parentTitle: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** `Decimal` do Prisma não é `number` — converter aqui evita `[object Object]` na tela. */
function toRecord(row: PresetRow): SystemPresetRecord {
  return { ...row, defaultPrice: Number(row.defaultPrice) };
}

export async function countSystemPresets(): Promise<number> {
  return db.systemPreset.count();
}

export async function findManySystemPresets(
  businessType?: string
): Promise<SystemPresetRecord[]> {
  const rows = await db.systemPreset.findMany({
    where: businessType && businessType !== "ALL" ? { businessType } : {},
    orderBy: [{ businessType: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRecord);
}

export async function findActiveSystemPresets(
  businessType: string
): Promise<SystemPresetRecord[]> {
  const rows = await db.systemPreset.findMany({
    where: { businessType, isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRecord);
}

export async function createSystemPresetRecord(data: {
  businessType: string;
  title: string;
  description?: string | null;
  defaultPrice: number;
  durationMin: number;
  isExtra: boolean;
  parentTitle?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<void> {
  await db.systemPreset.create({
    data: {
      businessType: data.businessType,
      title: data.title,
      description: data.description || null,
      defaultPrice: data.defaultPrice,
      durationMin: data.durationMin,
      isExtra: data.isExtra,
      parentTitle: data.parentTitle || null,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateSystemPresetRecord(
  id: string,
  data: {
    title: string;
    description?: string | null;
    defaultPrice: number;
    durationMin: number;
    isExtra: boolean;
    parentTitle?: string | null;
  }
): Promise<void> {
  await db.systemPreset.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      defaultPrice: data.defaultPrice,
      durationMin: data.durationMin,
      isExtra: data.isExtra,
      parentTitle: data.parentTitle || null,
    },
  });
}

export async function toggleSystemPresetActiveRecord(
  id: string,
  currentState: boolean
): Promise<void> {
  await db.systemPreset.update({
    where: { id },
    data: { isActive: !currentState },
  });
}

export async function deleteSystemPresetRecord(id: string): Promise<void> {
  await db.systemPreset.delete({ where: { id } });
}
