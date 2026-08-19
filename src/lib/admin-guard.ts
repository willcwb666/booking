import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Verificação de super admin para server actions.
 *
 * Vale insistir no motivo de existir: o layout de `(admin)` protege a
 * *página*, não a *action*. Toda server action é um endpoint HTTP próprio,
 * chamável por qualquer um que saiba o identificador — passar pelo layout não
 * é pré-requisito para invocá-la. Uma action de administração sem esta
 * verificação está aberta ao mundo, mesmo que a tela que a usa esteja
 * trancada.
 *
 * Cada arquivo de action tinha (ou não tinha) a sua própria checagem, escrita
 * ora como `role === "admin"`, ora como `role !== "admin"`, o que também
 * dificultava auditar quem estava coberto. Agora é uma função só.
 */
export async function requireSuperAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Não autenticado" };
  if (session.user.role !== "admin") return { ok: false, error: "Acesso negado" };
  return { ok: true, userId: session.user.id };
}

/** Versão que lança — para actions que já tratam exceção. */
export async function assertSuperAdmin(): Promise<string> {
  const check = await requireSuperAdmin();
  if (!check.ok) throw new Error(check.error);
  return check.userId;
}

/**
 * Acesso a uma empresa específica: membro ativo dela, ou super admin.
 *
 * Usado por actions que uma tela de empresa chama em nome de um usuário
 * comum — onde exigir super admin quebraria o uso legítimo, mas aceitar
 * qualquer slug permitiria ler dados de outra empresa.
 */
export async function canAccessCompany(
  companySlugOrId: string
): Promise<{ ok: true; companyId: string } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Não autenticado" };

  const company = await db.company.findFirst({
    where: { OR: [{ slug: companySlugOrId }, { id: companySlugOrId }] },
    select: { id: true },
  });
  if (!company) return { ok: false, error: "Empresa não encontrada" };

  if (session.user.role === "admin") return { ok: true, companyId: company.id };

  const member = await db.companyUser.findUnique({
    where: {
      companyId_userId: { companyId: company.id, userId: session.user.id },
    },
    select: { isActive: true },
  });
  if (!member || !member.isActive) {
    return { ok: false, error: "Sem permissão para esta empresa" };
  }

  return { ok: true, companyId: company.id };
}
