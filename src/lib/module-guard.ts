import "server-only";
import { db } from "@/lib/db";
import { canAccessCompany } from "@/lib/admin-guard";

/**
 * Acesso a um módulo licenciado.
 *
 * ─── Por que isto precisava existir ──────────────────────────────────────────
 *
 * Até aqui, módulo licenciado era escondido do MENU e nada mais. Quem soubesse
 * a URL entrava — a licença decorava a navegação em vez de guardar a porta.
 * Para os módulos existentes isso é um problema comercial. Para o cofre de
 * fotos, que guarda rosto de cliente, seria outra categoria de problema.
 *
 * Toda página e toda action do cofre passam por aqui.
 */

export type ModuleAccess =
  | { ok: true; companyId: string }
  | { ok: false; error: string };

export async function canAccessModule(
  companySlug: string,
  moduleCode: string
): Promise<ModuleAccess> {
  const access = await canAccessCompany(companySlug);
  if (!access.ok) return access;

  const license = await db.companyModuleLicense.findUnique({
    where: { companyId_moduleCode: { companyId: access.companyId, moduleCode } },
    select: { status: true, expiresAt: true },
  });

  if (!license || license.status !== "ACTIVE") {
    return { ok: false, error: "Módulo não contratado" };
  }

  // Licença vencida vale como não contratada. Deixar o acesso de pé até alguém
  // rodar uma rotina de expiração significa que a data de validade é decorativa
  // — e, para um módulo que guarda foto de cliente, é acesso de quem já saiu.
  if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "Licença do módulo expirada" };
  }

  return { ok: true, companyId: access.companyId };
}

/**
 * A licença do módulo, SEM exigir sessão.
 *
 * ─── Por que não dá para usar `canAccessModule` em tudo ──────────────────────
 *
 * Parte da superfície de um módulo é pública por natureza: o cliente entra na
 * lista de espera pela página de agendamento, e valida o código do
 * vale-presente no checkout, sem nunca ter feito login. `canAccessModule`
 * começa por `canAccessCompany`, que exige sessão — usá-lo ali derrubaria o
 * fluxo do cliente em vez de checar a licença.
 *
 * O que importa nesses caminhos é só uma coisa: se a empresa não contratou o
 * módulo, ninguém entra na lista de espera dela nem gasta vale-presente,
 * logado ou não.
 */
export async function isModuleLicensed(
  companySlug: string,
  moduleCode: string
): Promise<boolean> {
  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return false;

  const license = await db.companyModuleLicense.findUnique({
    where: { companyId_moduleCode: { companyId: company.id, moduleCode } },
    select: { status: true, expiresAt: true },
  });

  if (!license || license.status !== "ACTIVE") return false;
  if (license.expiresAt && license.expiresAt.getTime() <= Date.now()) return false;
  return true;
}
