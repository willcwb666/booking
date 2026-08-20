import "server-only";
import { db } from "@/lib/db";

/**
 * Segmentos de negócio cadastrados pelo super admin.
 *
 * Mesmo caso de `system-preset-db.ts`, e pelo mesmo motivo: cada função tinha
 * uma implementação Prisma e, abaixo dela, um fallback em SQL concatenado que
 * o `if ((db as any).systemSegment?.…)` tornava inalcançável desde que o model
 * entrou no schema. O `DELETE FROM "system_segment" WHERE id = '${id}'` não
 * escapava nada.
 *
 * Código morto protegido por um `if` não é código seguro — é um furo esperando
 * alguém simplificar a condição. Foi apagado, junto com o
 * `CREATE TABLE IF NOT EXISTS` que rodava antes de cada operação.
 */

export type SystemSegmentRecord = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export async function countSystemSegments(): Promise<number> {
  return db.systemSegment.count();
}

export async function findManySystemSegments(
  onlyActive = false
): Promise<SystemSegmentRecord[]> {
  return db.systemSegment.findMany({
    where: onlyActive ? { isActive: true } : {},
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createSystemSegmentRecord(data: {
  code: string;
  label: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<void> {
  await db.systemSegment.create({
    data: {
      code: data.code.toUpperCase(),
      label: data.label,
      description: data.description || null,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateSystemSegmentRecord(
  id: string,
  data: {
    code: string;
    label: string;
    description?: string | null;
    displayOrder?: number;
  }
): Promise<void> {
  await db.systemSegment.update({
    where: { id },
    data: {
      code: data.code.toUpperCase(),
      label: data.label,
      description: data.description || null,
      displayOrder: data.displayOrder ?? 0,
    },
  });
}

export async function toggleSystemSegmentActiveRecord(
  id: string,
  currentState: boolean
): Promise<void> {
  await db.systemSegment.update({
    where: { id },
    data: { isActive: !currentState },
  });
}

export async function deleteSystemSegmentRecord(id: string): Promise<void> {
  await db.systemSegment.delete({ where: { id } });
}
