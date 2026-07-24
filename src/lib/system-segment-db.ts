import { db } from "@/lib/db";

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

let tableEnsured = false;

async function ensureTableExists() {
  if (tableEnsured) return;
  try {
    const ddl = `
      CREATE TABLE IF NOT EXISTS "system_segment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "code" TEXT NOT NULL UNIQUE,
        "label" TEXT NOT NULL,
        "description" TEXT,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "system_segment_isActive_idx" ON "system_segment"("isActive");
    `;
    await db.$executeRawUnsafe(ddl);
    tableEnsured = true;
  } catch {
    // ignorar se tabela já existir ou falhar
  }
}

export async function countSystemSegments(): Promise<number> {
  await ensureTableExists();
  try {
    if ((db as any).systemSegment?.count) {
      return await (db as any).systemSegment.count();
    }
    const rows = await db.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*)::int as count FROM "system_segment"`
    );
    return Number(rows[0]?.count || 0);
  } catch {
    return 0;
  }
}

export async function findManySystemSegments(onlyActive = false): Promise<SystemSegmentRecord[]> {
  await ensureTableExists();
  try {
    if ((db as any).systemSegment?.findMany) {
      const where = onlyActive ? { isActive: true } : {};
      return await (db as any).systemSegment.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      });
    }

    let sql = `SELECT id, code, label, description, "displayOrder", "isActive", "createdAt", "updatedAt" FROM "system_segment"`;
    if (onlyActive) {
      sql += ` WHERE "isActive" = true`;
    }
    sql += ` ORDER BY "displayOrder" ASC, "createdAt" ASC`;

    return await db.$queryRawUnsafe<SystemSegmentRecord[]>(sql);
  } catch {
    return [];
  }
}

export async function createSystemSegmentRecord(data: {
  code: string;
  label: string;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<void> {
  await ensureTableExists();
  if ((db as any).systemSegment?.create) {
    await (db as any).systemSegment.create({
      data: {
        code: data.code.toUpperCase(),
        label: data.label,
        description: data.description || null,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
    return;
  }

  const id = `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const code = data.code.toUpperCase().replace(/'/g, "''");
  const label = data.label.replace(/'/g, "''");
  const desc = data.description ? `'${data.description.replace(/'/g, "''")}'` : "NULL";

  const sql = `INSERT INTO "system_segment" (id, code, label, description, "displayOrder", "isActive", "createdAt", "updatedAt") VALUES ('${id}', '${code}', '${label}', ${desc}, ${data.displayOrder ?? 0}, ${data.isActive ?? true}, NOW(), NOW())`;

  await db.$executeRawUnsafe(sql);
}

export async function updateSystemSegmentRecord(id: string, data: {
  code: string;
  label: string;
  description?: string | null;
  displayOrder?: number;
}): Promise<void> {
  await ensureTableExists();
  if ((db as any).systemSegment?.update) {
    await (db as any).systemSegment.update({
      where: { id },
      data: {
        code: data.code.toUpperCase(),
        label: data.label,
        description: data.description || null,
        displayOrder: data.displayOrder ?? 0,
      },
    });
    return;
  }

  const code = data.code.toUpperCase().replace(/'/g, "''");
  const label = data.label.replace(/'/g, "''");
  const desc = data.description ? `'${data.description.replace(/'/g, "''")}'` : "NULL";

  const sql = `UPDATE "system_segment" SET code = '${code}', label = '${label}', description = ${desc}, "displayOrder" = ${data.displayOrder ?? 0}, "updatedAt" = NOW() WHERE id = '${id}'`;

  await db.$executeRawUnsafe(sql);
}

export async function toggleSystemSegmentActiveRecord(id: string, currentState: boolean): Promise<void> {
  await ensureTableExists();
  if ((db as any).systemSegment?.update) {
    await (db as any).systemSegment.update({
      where: { id },
      data: { isActive: !currentState },
    });
    return;
  }

  const sql = `UPDATE "system_segment" SET "isActive" = ${!currentState ? "true" : "false"}, "updatedAt" = NOW() WHERE id = '${id}'`;
  await db.$executeRawUnsafe(sql);
}

export async function deleteSystemSegmentRecord(id: string): Promise<void> {
  await ensureTableExists();
  if ((db as any).systemSegment?.delete) {
    await (db as any).systemSegment.delete({ where: { id } });
    return;
  }

  const sql = `DELETE FROM "system_segment" WHERE id = '${id}'`;
  await db.$executeRawUnsafe(sql);
}
