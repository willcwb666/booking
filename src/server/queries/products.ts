import "server-only";
import { db } from "@/lib/db";

export type ProductItem = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  costPrice: number;
  salePrice: number;
  stockQuantity: number;
  minStockThreshold: number;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isLowStock: boolean;
  totalSold: number;
  createdAt: string;
};

export type ProductStats = {
  totalProducts: number;
  totalStockUnits: number;
  totalStockCostValue: number;
  totalStockSaleValue: number;
  lowStockCount: number;
};

/** Busca estatísticas de estoque da empresa */
export async function getProductStats(companySlug: string): Promise<ProductStats> {
  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) {
    return {
      totalProducts: 0,
      totalStockUnits: 0,
      totalStockCostValue: 0,
      totalStockSaleValue: 0,
      lowStockCount: 0,
    };
  }

  const products = await db.product.findMany({
    where: { companyId: company.id, isActive: true },
    select: {
      stockQuantity: true,
      minStockThreshold: true,
      costPrice: true,
      salePrice: true,
    },
  });

  let totalUnits = 0;
  let totalCost = 0;
  let totalSale = 0;
  let lowStock = 0;

  for (const p of products) {
    const qty = p.stockQuantity;
    totalUnits += qty;
    totalCost += qty * Number(p.costPrice);
    totalSale += qty * Number(p.salePrice);
    if (qty <= p.minStockThreshold) {
      lowStock++;
    }
  }

  return {
    totalProducts: products.length,
    totalStockUnits: totalUnits,
    totalStockCostValue: totalCost,
    totalStockSaleValue: totalSale,
    lowStockCount: lowStock,
  };
}

/** Lista produtos com paginação, busca e filtros */
export async function getCompanyProducts(
  companySlug: string,
  opts: { page?: number; pageSize?: number; search?: string; category?: string; lowStockOnly?: boolean } = {}
): Promise<{ items: ProductItem[]; total: number; page: number; pageSize: number; pageCount: number }> {
  const { page = 1, pageSize = 10, search, category, lowStockOnly } = opts;

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return { items: [], total: 0, page, pageSize, pageCount: 0 };

  const where: any = {
    companyId: company.id,
    isActive: true,
  };

  if (category && category !== "ALL") {
    where.category = category;
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { sku: { contains: s, mode: "insensitive" } },
      { barcode: { contains: s, mode: "insensitive" } },
      { category: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { saleItems: true },
        },
      },
    }),
  ]);

  const items: ProductItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    sku: r.sku,
    barcode: r.barcode,
    costPrice: Number(r.costPrice),
    salePrice: Number(r.salePrice),
    stockQuantity: r.stockQuantity,
    minStockThreshold: r.minStockThreshold,
    category: r.category,
    description: r.description,
    imageUrl: r.imageUrl,
    isActive: r.isActive,
    isLowStock: r.stockQuantity <= r.minStockThreshold,
    totalSold: r._count.saleItems,
    createdAt: r.createdAt.toISOString(),
  }));

  // Se o filtro de estoque baixo estiver ativado na visualização
  const filteredItems = lowStockOnly ? items.filter((i) => i.isLowStock) : items;

  return {
    items: filteredItems,
    total: lowStockOnly ? filteredItems.length : total,
    page,
    pageSize,
    pageCount: Math.ceil((lowStockOnly ? filteredItems.length : total) / pageSize),
  };
}

/** Retorna lista rápida de produtos para o Frente de Caixa (POS) */
export async function getProductsForPos(companySlug: string): Promise<
  Array<{
    id: string;
    name: string;
    salePrice: number;
    stockQuantity: number;
    category: string | null;
    barcode: string | null;
  }>
> {
  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return [];

  const products = await db.product.findMany({
    where: { companyId: company.id, isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      salePrice: true,
      stockQuantity: true,
      category: true,
      barcode: true,
    },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    salePrice: Number(p.salePrice),
    stockQuantity: p.stockQuantity,
    category: p.category,
    barcode: p.barcode,
  }));
}

/** Retorna categorias distintas de produtos da empresa */
export async function getProductCategories(companySlug: string): Promise<string[]> {
  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return [];

  const distinct = await db.product.findMany({
    where: { companyId: company.id, isActive: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });

  return distinct.map((d) => d.category!).filter(Boolean);
}
