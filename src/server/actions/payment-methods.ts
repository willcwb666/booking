"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: true } | { success: false; error: string };

const KINDS = ["STRIPE_CARD", "MERCADOPAGO_PIX", "MANUAL"] as const;
type Kind = (typeof KINDS)[number];

async function requireOwnerOrManager(companySlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Não autenticado" as const };

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, isActive: true, company: { slug: companySlug } },
    include: { company: { select: { id: true, slug: true } } },
  });

  if (!member || (member.role !== "OWNER" && member.role !== "MANAGER")) {
    return { error: "Sem permissão" as const };
  }

  return { member };
}

export async function addPaymentMethodAction(formData: FormData): Promise<Result> {
  const companySlug = (formData.get("companySlug") as string) ?? "";
  const ctx = await requireOwnerOrManager(companySlug);
  if ("error" in ctx) return { success: false, error: ctx.error as string };
  const companyId = ctx.member.company.id;

  const kindRaw = formData.get("kind") as string;
  const label = ((formData.get("label") as string) || "").trim();
  const handle = ((formData.get("handle") as string) || "").trim() || null;
  const instructions = ((formData.get("instructions") as string) || "").trim() || null;

  if (!KINDS.includes(kindRaw as Kind)) {
    return { success: false, error: "Tipo de pagamento inválido" };
  }
  const kind = kindRaw as Kind;

  if (!label || label.length > 60) {
    return { success: false, error: "Nome da forma de pagamento é obrigatório (máx. 60 caracteres)" };
  }
  if (handle && handle.length > 200) {
    return { success: false, error: "Identificador muito longo" };
  }
  if (instructions && instructions.length > 500) {
    return { success: false, error: "Instruções muito longas" };
  }

  // Métodos automáticos são únicos por empresa (um gateway de cada)
  if (kind !== "MANUAL") {
    const existing = await db.companyPaymentMethod.findFirst({
      where: { companyId, kind },
    });
    if (existing) {
      return { success: false, error: "Já existe uma forma de pagamento deste tipo" };
    }
  }

  // PIX automático exige token do Mercado Pago configurado
  if (kind === "MERCADOPAGO_PIX") {
    const settings = await db.companyPaymentSettings.findUnique({
      where: { companyId },
      select: { mercadoPagoAccessToken: true },
    });
    if (!settings?.mercadoPagoAccessToken) {
      return {
        success: false,
        error: "Configure o token do Mercado Pago antes de ativar o PIX automático",
      };
    }
  }

  const last = await db.companyPaymentMethod.findFirst({
    where: { companyId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  await db.companyPaymentMethod.create({
    data: {
      companyId,
      kind,
      label,
      handle: kind === "MANUAL" ? handle : null,
      instructions: kind === "MANUAL" ? instructions : null,
      displayOrder: (last?.displayOrder ?? 0) + 10,
    },
  });

  revalidatePath(`/${companySlug}/configuracoes`);
  return { success: true };
}

export async function togglePaymentMethodAction(
  methodId: string,
  companySlug: string
): Promise<Result> {
  const ctx = await requireOwnerOrManager(companySlug);
  if ("error" in ctx) return { success: false, error: ctx.error as string };
  const companyId = ctx.member.company.id;

  const method = await db.companyPaymentMethod.findFirst({
    where: { id: methodId, companyId },
  });
  if (!method) return { success: false, error: "Forma de pagamento não encontrada" };

  // Pelo menos uma forma ativa precisa restar
  if (method.isActive) {
    const activeCount = await db.companyPaymentMethod.count({
      where: { companyId, isActive: true },
    });
    if (activeCount <= 1) {
      return { success: false, error: "Mantenha pelo menos uma forma de pagamento ativa" };
    }
  }

  await db.companyPaymentMethod.update({
    where: { id: methodId },
    data: { isActive: !method.isActive },
  });

  revalidatePath(`/${companySlug}/configuracoes`);
  return { success: true };
}

export async function removePaymentMethodAction(
  methodId: string,
  companySlug: string
): Promise<Result> {
  const ctx = await requireOwnerOrManager(companySlug);
  if ("error" in ctx) return { success: false, error: ctx.error as string };
  const companyId = ctx.member.company.id;

  const method = await db.companyPaymentMethod.findFirst({
    where: { id: methodId, companyId },
  });
  if (!method) return { success: false, error: "Forma de pagamento não encontrada" };

  if (method.isActive) {
    const activeCount = await db.companyPaymentMethod.count({
      where: { companyId, isActive: true },
    });
    if (activeCount <= 1) {
      return { success: false, error: "Mantenha pelo menos uma forma de pagamento ativa" };
    }
  }

  // Bookings existentes mantêm o histórico (FK é SetNull)
  await db.companyPaymentMethod.delete({ where: { id: methodId } });

  revalidatePath(`/${companySlug}/configuracoes`);
  return { success: true };
}
