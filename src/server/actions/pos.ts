"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActiveSession } from "@/lib/session";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";

async function verifyCompanyAccess(companySlug: string) {
  const session = await getActiveSession();
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
  }

  return { company, user: session.user };
}

export type CreatePosSaleInput = {
  bookingId?: string | null;
  professionalId?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{
    type: "PRODUCT" | "SERVICE" | "FEE";
    productId?: string | null;
    serviceId?: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  discountAmount?: number;
  paymentMethod: string;
  notes?: string;
};

/** Finaliza uma comanda / venda no Frente de Caixa (POS) */
export async function createPosSaleAction(companySlug: string, data: CreatePosSaleInput) {
  try {
    const { company, user } = await verifyCompanyAccess(companySlug);

    // Venda mexe em dinheiro e estoque: limita rajada por operador (erro de
    // duplo clique, script apontado para a action, caixa comprometido).
    const rl = await enforceRateLimit(RATE_LIMITS.POS_SALE, user.id);
    if (!rl.allowed) return { success: false, error: rl.message };

    if (!data.items || data.items.length === 0) {
      throw new Error("Adicione pelo menos um item à comanda");
    }

    // Produtos: preço vem do servidor (não confia no cliente) e o lookup é
    // escopado à empresa — fecha o IDOR de productId e a manipulação de preço.
    const productIds = data.items
      .filter((it) => it.type === "PRODUCT" && it.productId)
      .map((it) => it.productId as string);
    const products = productIds.length
      ? await db.product.findMany({
          where: { id: { in: productIds }, companyId: company.id },
          select: { id: true, salePrice: true, name: true },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const itemsData = data.items.map((it) => {
      const qty = Math.max(1, it.quantity);
      let unitPrice = Math.max(0, it.unitPrice);
      let name = it.name.trim();

      if (it.type === "PRODUCT" && it.productId) {
        const p = productMap.get(it.productId);
        if (!p) throw new Error("Produto inválido ou de outra empresa");
        unitPrice = Number(p.salePrice); // preço autoritativo do servidor
        name = name || p.name;
      }

      const total = qty * unitPrice;
      subtotal += total;
      return {
        type: it.type,
        productId: it.productId || null,
        serviceId: it.serviceId || null,
        name,
        quantity: qty,
        unitPrice,
        totalPrice: total,
      };
    });

    const discount = data.discountAmount ? Math.max(0, data.discountAmount) : 0;
    const total = Math.max(0, subtotal - discount);

    // Cálculo de comissão do profissional
    let commissionAmount = 0;
    if (data.professionalId) {
      const prof = await db.professional.findUnique({
        where: { id: data.professionalId, companyId: company.id },
      });

      if (prof) {
        const prodRate = Number(prof.productCommissionRate ?? 0) / 100;
        const servRate = Number(prof.commissionRate ?? prof.commissionPercentage ?? 0) / 100;

        for (const it of itemsData) {
          if (it.type === "PRODUCT" && prodRate > 0) {
            commissionAmount += it.totalPrice * prodRate;
          } else if (it.type === "SERVICE" && servRate > 0) {
            commissionAmount += it.totalPrice * servRate;
          }
        }
      }
    }

    const sale = await db.$transaction(async (tx) => {
      const newSale = await tx.posSale.create({
        data: {
          companyId: company.id,
          bookingId: data.bookingId || null,
          professionalId: data.professionalId || null,
          customerName: data.customerName?.trim() || null,
          customerEmail: data.customerEmail?.trim().toLowerCase() || null,
          customerPhone: data.customerPhone?.trim() || null,
          subtotal,
          discountAmount: discount,
          total,
          paymentMethod: data.paymentMethod,
          status: "COMPLETED",
          commissionAmount,
          notes: data.notes?.trim() || null,
          createdById: user.id,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: true,
        },
      });

      // Baixa automática de estoque para produtos — decremento ATÔMICO e
      // escopado à empresa (evita corrida/lost-update e IDOR). Permite estoque
      // negativo como indicador honesto de oversell (não bloqueia a venda).
      for (const it of itemsData) {
        if (it.type === "PRODUCT" && it.productId) {
          const dec = await tx.product.updateMany({
            where: { id: it.productId, companyId: company.id },
            data: { stockQuantity: { decrement: it.quantity } },
          });
          if (dec.count !== 1) continue; // produto não é desta empresa — ignora

          const updated = await tx.product.findUnique({
            where: { id: it.productId },
            select: { stockQuantity: true },
          });
          const newStock = updated?.stockQuantity ?? 0;

          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              type: "SALE",
              quantity: -it.quantity,
              previousStock: newStock + it.quantity,
              newStock,
              reason: `Venda POS #${newSale.id.slice(-6)}`,
              userId: user.id,
            },
          });
        }
      }

      // Se houver agendamento vinculado, marca como concluído e pago —
      // escopado por companyId para não afetar bookings de outra empresa (IDOR).
      if (data.bookingId) {
        await tx.booking.updateMany({
          where: { id: data.bookingId, companyId: company.id },
          data: {
            status: "COMPLETED",
            paymentStatus: "PAID",
          },
        });
      }

      return newSale;
    });

    revalidatePath(`/${companySlug}/pos`);
    revalidatePath(`/${companySlug}/produtos`);
    revalidatePath(`/${companySlug}/agendamentos`);
    revalidatePath(`/${companySlug}/relatorios`);

    return { success: true, data: sale };
  } catch (err: unknown) {
    console.error("[createPosSaleAction] Erro:", err);
    return { success: false, error: err instanceof Error ? err.message : "Erro ao registrar venda no POS" };
  }
}
