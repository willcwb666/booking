"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: true } | { success: false; error: string };

async function requireOwnerOrManager(companySlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Não autenticado" as const };

  const member = await db.companyUser.findFirst({
    where: {
      userId: session.user.id,
      isActive: true,
      company: { slug: companySlug },
    },
    include: { company: { select: { id: true, slug: true } } },
  });

  if (!member || (member.role !== "OWNER" && member.role !== "MANAGER")) {
    return { error: "Sem permissão" as const };
  }

  return { member };
}

export async function updatePaymentSettingsAction(
  formData: FormData
): Promise<Result> {
  const companySlug = (formData.get("companySlug") as string | null) ?? "";
  const ctx = await requireOwnerOrManager(companySlug);
  if ("error" in ctx) return { success: false, error: ctx.error as string };

  const companyId = ctx.member.company.id;
  const enableCard = formData.get("enableCard") === "on";
  const enableCashCheck = formData.get("enableCashCheck") === "on";
  const enablePix = formData.get("enablePix") === "on";
  const pixKey = (formData.get("pixKey") as string)?.trim() || null;
  const pixKeyType = (formData.get("pixKeyType") as string) || null;

  // At least one payment method must be active
  if (!enableCard && !enableCashCheck && !enablePix) {
    return { success: false, error: "Habilite pelo menos uma forma de pagamento" };
  }

  await db.companyPaymentSettings.upsert({
    where: { companyId },
    update: {
      enableCard,
      enableCashCheck,
      enablePix,
      pixKey: enablePix ? pixKey : null,
      pixKeyType: enablePix ? pixKeyType : null,
    },
    create: {
      companyId,
      enableCard,
      enableCashCheck,
      enablePix,
      pixKey: enablePix ? pixKey : null,
      pixKeyType: enablePix ? pixKeyType : null,
    },
  });

  revalidatePath(`/${companySlug}/configuracoes`);
  return { success: true };
}
