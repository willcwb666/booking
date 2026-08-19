"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { writeAuditRow } from "@/lib/audit";

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

// `logAuditEvent` saiu daqui para `src/lib/audit-log.ts`.
//
// Exportada de um arquivo `"use server"` ela era um endpoint HTTP: qualquer
// pessoa escrevia entradas arbitrarias na trilha de auditoria. Forjar log e
// sujar exatamente o registro que se consulta quando algo da errado.

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
