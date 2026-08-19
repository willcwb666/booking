import "server-only";
import { db } from "@/lib/db";

/**
 * Escrita da trilha de auditoria.
 *
 * Vive aqui, e não na server action, porque `@/lib/auth` também precisa
 * registrar eventos (impersonation) e importar uma action de dentro do
 * `betterAuth()` criaria um ciclo.
 */
export async function writeAuditRow(row: {
  companyId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
}): Promise<void> {
  const details =
    typeof row.details === "object" && row.details !== null
      ? JSON.stringify(row.details)
      : (row.details ?? null);

  try {
    await db.auditLog.create({
      data: {
        companyId: row.companyId ?? null,
        userId: row.userId ?? null,
        action: row.action,
        entity: row.entity,
        details,
        ipAddress: row.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Auditoria nunca derruba a operação que ela está registrando.
    console.error("[audit] falha ao gravar evento:", row.action, err);
  }
}
