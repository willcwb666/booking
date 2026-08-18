"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getGiftCardByCode } from "@/server/queries/gift-cards";

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let seg1 = "";
  let seg2 = "";
  for (let i = 0; i < 4; i++) {
    seg1 += chars.charAt(Math.floor(Math.random() * chars.length));
    seg2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GIFT-${seg1}-${seg2}`;
}

/**
 * Garante que o usuário atual gerencia a empresa com o papel mínimo exigido.
 * Emitir/cancelar vales equivale a emitir dinheiro → exige MANAGER+ (OWNER e
 * admin global também passam). EMPLOYEE não pode.
 */
async function verifyCompanyAccess(
  companySlug: string,
  minRole: "MANAGER" | "OWNER" = "MANAGER"
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado");

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true, currency: true },
  });
  if (!company) throw new Error("Empresa não encontrada");

  const isSuperAdmin = session.user.role === "admin";
  if (!isSuperAdmin) {
    const member = await db.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId: company.id,
          userId: session.user.id,
        },
      },
    });
    if (!member || !member.isActive) {
      throw new Error("Sem permissão para gerenciar esta empresa");
    }
    const isOwner = member.role === "OWNER";
    const canManage = isOwner || member.role === "MANAGER";
    if (minRole === "OWNER" && !isOwner) {
      throw new Error("Ação restrita ao proprietário da empresa");
    }
    if (minRole === "MANAGER" && !canManage) {
      throw new Error("Ação restrita a gerentes e administradores");
    }
  }

  return { company, user: session.user };
}

/** Cria um novo Gift Card manualmente pela empresa */
export async function createGiftCardAction(
  companySlug: string,
  data: {
    amount: number;
    customCode?: string;
    buyerName?: string;
    buyerEmail?: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    message?: string;
    expiresInDays?: number | null;
  }
) {
  try {
    const { company } = await verifyCompanyAccess(companySlug);

    if (!data.amount || data.amount <= 0) {
      throw new Error("O valor do Gift Card deve ser maior que zero");
    }

    let code = data.customCode?.trim().toUpperCase();
    if (!code) {
      // Gera código aleatório único
      let unique = false;
      while (!unique) {
        code = generateGiftCardCode();
        const existing = await db.giftCard.findUnique({ where: { code } });
        if (!existing) unique = true;
      }
    } else {
      const existing = await db.giftCard.findUnique({ where: { code } });
      if (existing) {
        throw new Error("Já existe um Gift Card cadastrado com este código");
      }
    }

    let expiresAt: Date | null = null;
    if (data.expiresInDays && data.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const card = await db.giftCard.create({
      data: {
        companyId: company.id,
        code: code!,
        initialBalance: data.amount,
        currentBalance: data.amount,
        currency: company.currency || "BRL",
        buyerName: data.buyerName?.trim() || null,
        buyerEmail: data.buyerEmail?.trim().toLowerCase() || null,
        recipientName: data.recipientName?.trim() || null,
        recipientEmail: data.recipientEmail?.trim().toLowerCase() || null,
        recipientPhone: data.recipientPhone?.trim() || null,
        message: data.message?.trim() || null,
        status: "ACTIVE",
        expiresAt,
      },
    });

    revalidatePath(`/${companySlug}/gift-cards`);
    return { success: true, data: card };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message ||"Erro ao criar Gift Card" };
  }
}

/** Cancela um Gift Card */
export async function cancelGiftCardAction(companySlug: string, giftCardId: string) {
  try {
    const { company } = await verifyCompanyAccess(companySlug);

    await db.giftCard.update({
      where: { id: giftCardId, companyId: company.id },
      data: { status: "CANCELLED" },
    });

    revalidatePath(`/${companySlug}/gift-cards`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message ||"Erro ao cancelar Gift Card" };
  }
}

/** Validação pública de Gift Card para o checkout (rate-limited por IP para
 *  impedir força-bruta/enumeração de códigos e saldos). */
export async function validateGiftCardAction(companySlug: string, code: string) {
  try {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "unknown";
    const rl = await rateLimit(`giftcard:validate:${ip}`, 10, 60);
    if (!rl.allowed) {
      return { success: false, error: "Muitas tentativas. Aguarde um momento." };
    }

    const card = await getGiftCardByCode(companySlug, code);
    if (!card) {
      return { success: false, error: "Vale-presente não encontrado" };
    }
    if (!card.isValid) {
      return {
        success: false,
        error:
          card.status === "EXHAUSTED"
            ? "Este vale-presente já teve seu saldo 100% esgotado"
            : card.status === "EXPIRED"
            ? "Este vale-presente está expirado"
            : "Este vale-presente está inativo ou cancelado",
      };
    }

    return {
      success: true,
      data: {
        id: card.id,
        code: card.code,
        currentBalance: card.currentBalance,
        currency: card.currency,
        recipientName: card.recipientName,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message ||"Erro ao validar vale-presente" };
  }
}
