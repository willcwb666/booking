import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { writeAuditRow } from "@/lib/audit";

/**
 * Registra um evento na trilha de auditoria.
 *
 * Vive aqui, e nao em `server/actions`, de proposito: em arquivo
 * `"use server"` todo export vira endpoint publico, e escrever no log de
 * auditoria a partir de parametros livres permite forjar a trilha.
 */
export async function logAuditEvent(params: {
  companyId?: string | null;
  action: string;
  entity: string;
  details?: Record<string, unknown> | string;
}) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    const ip =
      reqHeaders.get("x-forwarded-for")?.split(",")[0] ||
      reqHeaders.get("x-real-ip") ||
      "unknown";

    // Prisma, não SQL bruto. A versão anterior rodava um
    // `CREATE TABLE IF NOT EXISTS` a CADA evento auditado — DDL em caminho
    // quente, pegando lock de tabela, para criar algo que já existe desde a
    // migration. `audit_log` é o model AuditLog do schema.
    await writeAuditRow({
      companyId: params.companyId ?? null,
      userId: session?.user?.id ?? null,
      action: params.action,
      entity: params.entity,
      details: params.details,
      ipAddress: ip,
    });
  } catch (err) {
    console.error("[audit-log] Failed to write audit log:", err);
  }
}
