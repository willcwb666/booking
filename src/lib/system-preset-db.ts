import { db } from "@/lib/db";

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

let tableEnsured = false;

async function ensureTableExists() {
  if (tableEnsured) return;
  try {
    const ddl = `
      CREATE TABLE IF NOT EXISTS "system_preset" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "businessType" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "defaultPrice" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        "durationMin" INTEGER NOT NULL DEFAULT 30,
        "isExtra" BOOLEAN NOT NULL DEFAULT false,
        "parentTitle" TEXT,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "system_preset_businessType_isActive_idx" ON "system_preset"("businessType", "isActive");
    `;
    await db.$executeRawUnsafe(ddl);
    tableEnsured = true;
  } catch {
    // ignorar se tabela já existir ou falhar
  }
}

export async function countSystemPresets(): Promise<number> {
  await ensureTableExists();
  try {
    if ((db as any).systemPreset?.count) {
      return await (db as any).systemPreset.count();
    }
    const rows = await db.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*)::int as count FROM "system_preset"`
    );
    return Number(rows[0]?.count || 0);
  } catch {
    return 0;
  }
}

export async function findManySystemPresets(businessType?: string): Promise<SystemPresetRecord[]> {
  await ensureTableExists();
  try {
    if ((db as any).systemPreset?.findMany) {
      const where = businessType && businessType !== "ALL" ? { businessType: businessType as any } : {};
      const res = await (db as any).systemPreset.findMany({
        where,
        orderBy: [{ businessType: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
      });
      return res.map((r: any) => ({ ...r, defaultPrice: Number(r.defaultPrice) }));
    }

    let sql = `SELECT id, "businessType", title, description, "defaultPrice"::float as "defaultPrice", "durationMin", "isExtra", "parentTitle", "displayOrder", "isActive", "createdAt", "updatedAt" FROM "system_preset"`;
    if (businessType && businessType !== "ALL") {
      sql += ` WHERE "businessType" = '${businessType}'`;
    }
    sql += ` ORDER BY "businessType" ASC, "displayOrder" ASC, "createdAt" ASC`;

    const rows = await db.$queryRawUnsafe<SystemPresetRecord[]>(sql);
    return rows.map((r) => ({ ...r, defaultPrice: Number(r.defaultPrice) }));
  } catch {
    return [];
  }
}

export async function findActiveSystemPresets(businessType: string): Promise<SystemPresetRecord[]> {
  await ensureTableExists();
  try {
    if ((db as any).systemPreset?.findMany) {
      const res = await (db as any).systemPreset.findMany({
        where: { businessType: businessType as any, isActive: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      });
      return res.map((r: any) => ({ ...r, defaultPrice: Number(r.defaultPrice) }));
    }

    const sql = `SELECT id, "businessType", title, description, "defaultPrice"::float as "defaultPrice", "durationMin", "isExtra", "parentTitle", "displayOrder", "isActive", "createdAt", "updatedAt" FROM "system_preset" WHERE "businessType" = '${businessType}' AND "isActive" = true ORDER BY "displayOrder" ASC, "createdAt" ASC`;

    const rows = await db.$queryRawUnsafe<SystemPresetRecord[]>(sql);
    return rows.map((r) => ({ ...r, defaultPrice: Number(r.defaultPrice) }));
  } catch {
    return [];
  }
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
  await ensureTableExists();
  if ((db as any).systemPreset?.create) {
    await (db as any).systemPreset.create({
      data: {
        businessType: data.businessType as any,
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
    return;
  }

  const id = `preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const desc = data.description ? `'${data.description.replace(/'/g, "''")}'` : "NULL";
  const parent = data.parentTitle ? `'${data.parentTitle.replace(/'/g, "''")}'` : "NULL";
  const title = data.title.replace(/'/g, "''");

  const sql = `INSERT INTO "system_preset" (id, "businessType", title, description, "defaultPrice", "durationMin", "isExtra", "parentTitle", "displayOrder", "isActive", "createdAt", "updatedAt") VALUES ('${id}', '${data.businessType}', '${title}', ${desc}, ${data.defaultPrice}, ${data.durationMin}, ${data.isExtra ? "true" : "false"}, ${parent}, ${data.displayOrder ?? 0}, ${data.isActive ?? true}, NOW(), NOW())`;

  await db.$executeRawUnsafe(sql);
}

export async function updateSystemPresetRecord(id: string, data: {
  title: string;
  description?: string | null;
  defaultPrice: number;
  durationMin: number;
  isExtra: boolean;
  parentTitle?: string | null;
}): Promise<void> {
  await ensureTableExists();
  if ((db as any).systemPreset?.update) {
    await (db as any).systemPreset.update({
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
    return;
  }

  const desc = data.description ? `'${data.description.replace(/'/g, "''")}'` : "NULL";
  const parent = data.parentTitle ? `'${data.parentTitle.replace(/'/g, "''")}'` : "NULL";
  const title = data.title.replace(/'/g, "''");

  const sql = `UPDATE "system_preset" SET title = '${title}', description = ${desc}, "defaultPrice" = ${data.defaultPrice}, "durationMin" = ${data.durationMin}, "isExtra" = ${data.isExtra ? "true" : "false"}, "parentTitle" = ${parent}, "updatedAt" = NOW() WHERE id = '${id}'`;

  await db.$executeRawUnsafe(sql);
}

export async function toggleSystemPresetActiveRecord(id: string, currentState: boolean): Promise<void> {
  await ensureTableExists();
  if ((db as any).systemPreset?.update) {
    await (db as any).systemPreset.update({
      where: { id },
      data: { isActive: !currentState },
    });
    return;
  }

  const sql = `UPDATE "system_preset" SET "isActive" = ${!currentState ? "true" : "false"}, "updatedAt" = NOW() WHERE id = '${id}'`;
  await db.$executeRawUnsafe(sql);
}

export async function deleteSystemPresetRecord(id: string): Promise<void> {
  await ensureTableExists();
  if ((db as any).systemPreset?.delete) {
    await (db as any).systemPreset.delete({ where: { id } });
    return;
  }

  const sql = `DELETE FROM "system_preset" WHERE id = '${id}'`;
  await db.$executeRawUnsafe(sql);
}
