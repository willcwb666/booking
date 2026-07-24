"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export type AuditLogItem = {
  id: string;
  companyId: string | null;
  userId: string | null;
  action: string;
  entity: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export async function logAuditEvent(params: {
  companyId?: string | null;
  action: string;
  entity: string;
  details?: Record<string, any> | string;
}) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const reqHeaders = await headers();
    const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0] || reqHeaders.get("x-real-ip") || "unknown";

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" TEXT PRIMARY KEY,
        "companyId" TEXT,
        "userId" TEXT,
        "action" TEXT NOT NULL,
        "entity" TEXT NOT NULL,
        "details" TEXT,
        "ipAddress" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const detailsStr = typeof params.details === "object" ? JSON.stringify(params.details) : params.details || null;

    await db.$executeRawUnsafe(
      `
      INSERT INTO "audit_log" (id, "companyId", "userId", action, entity, details, "ipAddress", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `,
      id,
      params.companyId || null,
      session?.user?.id || null,
      params.action,
      params.entity,
      detailsStr,
      ip
    );
  } catch (err) {
    console.error("[audit-log] Failed to write audit log:", err);
  }
}

export async function getPlatformAuditLogsAction(): Promise<{
  success: boolean;
  logs: AuditLogItem[];
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, logs: [] };
  }

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" TEXT PRIMARY KEY,
        "companyId" TEXT,
        "userId" TEXT,
        "action" TEXT NOT NULL,
        "entity" TEXT NOT NULL,
        "details" TEXT,
        "ipAddress" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    const rows = await db.$queryRawUnsafe<Array<{
      id: string;
      companyId: string | null;
      userId: string | null;
      action: string;
      entity: string;
      details: string | null;
      ipAddress: string | null;
      createdAt: Date | string;
    }>>(`SELECT * FROM "audit_log" ORDER BY "createdAt" DESC LIMIT 50`);

    const logs: AuditLogItem[] = rows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      userId: r.userId,
      action: r.action,
      entity: r.entity,
      details: r.details,
      ipAddress: r.ipAddress,
      createdAt: new Date(r.createdAt).toLocaleString("pt-BR"),
    }));

    return { success: true, logs };
  } catch (err) {
    console.error("Erro ao buscar logs de auditoria:", err);
    return { success: false, logs: [] };
  }
}
