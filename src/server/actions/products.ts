"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function verifyCompanyAccess(companySlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado");

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
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

/** Cria um novo produto */
export async function createProductAction(
  companySlug: string,
  data: {
    name: string;
    sku?: string;
    barcode?: string;
    costPrice?: number;
    salePrice: number;
    stockQuantity?: number;
    minStockThreshold?: number;
    category?: string;
    description?: string;
    imageUrl?: string;
  }
) {
  try {
    const { company, user } = await verifyCompanyAccess(companySlug);

    if (!data.name.trim() || data.salePrice <= 0) {
      throw new Error("Nome e preço de venda são obrigatórios");
    }

    const initialStock = data.stockQuantity ?? 0;

    const product = await db.product.create({
      data: {
        companyId: company.id,
        name: data.name.trim(),
        sku: data.sku?.trim() || null,
        barcode: data.barcode?.trim() || null,
        costPrice: data.costPrice ?? 0,
        salePrice: data.salePrice,
        stockQuantity: initialStock,
        minStockThreshold: data.minStockThreshold ?? 3,
        category: data.category?.trim() || null,
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
        isActive: true,
      },
    });

    if (initialStock > 0) {
      await db.stockMovement.create({
        data: {
          productId: product.id,
          type: "IN",
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          reason: "Estoque Inicial no Cadastro",
          userId: user.id,
        },
      });
    }

    revalidatePath(`/${companySlug}/produtos`);
    revalidatePath(`/${companySlug}/pos`);
    return { success: true, data: product };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao criar produto" };
  }
}

/** Atualiza um produto existente */
export async function updateProductAction(
  companySlug: string,
  productId: string,
  data: {
    name: string;
    sku?: string;
    barcode?: string;
    costPrice?: number;
    salePrice: number;
    minStockThreshold?: number;
    category?: string;
    description?: string;
    imageUrl?: string;
  }
) {
  try {
    const { company } = await verifyCompanyAccess(companySlug);

    const product = await db.product.update({
      where: { id: productId, companyId: company.id },
      data: {
        name: data.name.trim(),
        sku: data.sku?.trim() || null,
        barcode: data.barcode?.trim() || null,
        costPrice: data.costPrice ?? 0,
        salePrice: data.salePrice,
        minStockThreshold: data.minStockThreshold ?? 3,
        category: data.category?.trim() || null,
        description: data.description?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
      },
    });

    revalidatePath(`/${companySlug}/produtos`);
    revalidatePath(`/${companySlug}/pos`);
    return { success: true, data: product };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao atualizar produto" };
  }
}

/** Desativa / Remove um produto */
export async function deleteProductAction(companySlug: string, productId: string) {
  try {
    const { company } = await verifyCompanyAccess(companySlug);

    await db.product.update({
      where: { id: productId, companyId: company.id },
      data: { isActive: false },
    });

    revalidatePath(`/${companySlug}/produtos`);
    revalidatePath(`/${companySlug}/pos`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao remover produto" };
  }
}

/** Movimentação manual de estoque (Entrada ou Saída/Ajuste) */
export async function adjustStockAction(
  companySlug: string,
  productId: string,
  data: {
    type: "IN" | "OUT";
    quantity: number;
    reason?: string;
  }
) {
  try {
    const { company, user } = await verifyCompanyAccess(companySlug);

    if (data.quantity <= 0) {
      throw new Error("A quantidade deve ser maior que zero");
    }

    const product = await db.product.findUnique({
      where: { id: productId, companyId: company.id },
    });
    if (!product) throw new Error("Produto não encontrado");

    const previousStock = product.stockQuantity;
    const qtyChange = data.type === "IN" ? data.quantity : -data.quantity;
    const newStock = Math.max(0, previousStock + qtyChange);

    await db.$transaction([
      db.product.update({
        where: { id: productId },
        data: { stockQuantity: newStock },
      }),
      db.stockMovement.create({
        data: {
          productId,
          type: data.type,
          quantity: qtyChange,
          previousStock,
          newStock,
          reason: data.reason?.trim() || (data.type === "IN" ? "Entrada Manual" : "Saída Manual"),
          userId: user.id,
        },
      }),
    ]);

    revalidatePath(`/${companySlug}/produtos`);
    revalidatePath(`/${companySlug}/pos`);
    return { success: true, newStock };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao ajustar estoque" };
  }
}
