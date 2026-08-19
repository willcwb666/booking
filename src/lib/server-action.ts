import "server-only";
import { auth } from "@/lib/auth";
import { getActiveSession } from "@/lib/session";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import type { ActionResult } from "@/types";
import type { CompanyUserRole } from "@/generated/prisma/client";

export type CompanyAuthContext = {
  session: NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
  company: NonNullable<Awaited<ReturnType<typeof getCompanyBySlugForUser>>>;
  userId: string;
  role: CompanyUserRole;
  isOwner: boolean;
  canManage: boolean;
};

/**
 * Encapsula a validação de sessão e de permissão do usuário na empresa (tenant).
 * Elimina duplicação de boilerplate de autenticação em todas as Server Actions.
 */
export async function withCompanyAuth<T = unknown>(
  slug: string,
  minRole: "EMPLOYEE" | "MANAGER" | "OWNER" = "EMPLOYEE",
  handler: (ctx: CompanyAuthContext) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    // getActiveSession, não auth.api.getSession: aplica o timeout de
    // inatividade também nas server actions (o proxy cobre a navegação, mas
    // não podemos depender só dele).
    const session = await getActiveSession();
    if (!session) {
      return { success: false, errors: { _: ["Sessão expirada. Entre novamente."] } };
    }

    const company = await getCompanyBySlugForUser(slug, session.user.id);
    if (!company) {
      return { success: false, errors: { _: ["Empresa não encontrada ou acesso não autorizado."] } };
    }

    const memberRole = (company.members?.[0]?.role as CompanyUserRole) ?? "EMPLOYEE";
    const isGlobalAdmin = session.user.role === "admin";
    const isOwner = memberRole === "OWNER" || isGlobalAdmin;
    const canManage = isOwner || memberRole === "MANAGER";

    if (minRole === "OWNER" && !isOwner) {
      return { success: false, errors: { _: ["Ação restrita ao proprietário da empresa."] } };
    }

    if (minRole === "MANAGER" && !canManage) {
      return { success: false, errors: { _: ["Ação restrita a gerentes e administradores."] } };
    }

    return await handler({
      session,
      company,
      userId: session.user.id,
      role: memberRole,
      isOwner,
      canManage,
    });
  } catch (error) {
    console.error(`[withCompanyAuth] Erro inesperado ao processar action para "${slug}":`, error);
    return {
      success: false,
      errors: { _: [error instanceof Error ? error.message : "Erro interno do servidor."] },
    };
  }
}
