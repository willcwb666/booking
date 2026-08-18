import "server-only";
import { db } from "@/lib/db";

export type GiftCardItem = {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  buyerName: string | null;
  buyerEmail: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  message: string | null;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  totalRedemptions: number;
  redemptions: Array<{
    id: string;
    amount: number;
    redeemedAt: string;
    bookingId: string | null;
    notes: string | null;
  }>;
};

export type GiftCardStats = {
  totalIssuedAmount: number;
  totalOutstandingBalance: number;
  activeCardsCount: number;
  totalRedemptionsCount: number;
};

/** Busca métricas consolidadas de Gift Cards da empresa */
export async function getGiftCardStats(companySlug: string): Promise<GiftCardStats> {
  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) {
    return {
      totalIssuedAmount: 0,
      totalOutstandingBalance: 0,
      activeCardsCount: 0,
      totalRedemptionsCount: 0,
    };
  }

  const [cards, redemptionsCount] = await Promise.all([
    db.giftCard.findMany({
      where: { companyId: company.id },
      select: { initialBalance: true, currentBalance: true, status: true },
    }),
    db.giftCardRedemption.count({
      where: { giftCard: { companyId: company.id } },
    }),
  ]);

  let totalIssued = 0;
  let totalOutstanding = 0;
  let activeCount = 0;

  for (const c of cards) {
    totalIssued += Number(c.initialBalance);
    if (c.status === "ACTIVE") {
      totalOutstanding += Number(c.currentBalance);
      activeCount++;
    }
  }

  return {
    totalIssuedAmount: totalIssued,
    totalOutstandingBalance: totalOutstanding,
    activeCardsCount: activeCount,
    totalRedemptionsCount: redemptionsCount,
  };
}

/** Lista vales-presente emitidos com paginação, busca e filtros */
export async function getCompanyGiftCards(
  companySlug: string,
  opts: { page?: number; pageSize?: number; search?: string; status?: string } = {}
): Promise<{ items: GiftCardItem[]; total: number; page: number; pageSize: number; pageCount: number }> {
  const { page = 1, pageSize = 10, search, status } = opts;

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return { items: [], total: 0, page, pageSize, pageCount: 0 };

  const where: any = {
    companyId: company.id,
  };

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { code: { contains: s, mode: "insensitive" } },
      { buyerName: { contains: s, mode: "insensitive" } },
      { buyerEmail: { contains: s, mode: "insensitive" } },
      { recipientName: { contains: s, mode: "insensitive" } },
      { recipientEmail: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    db.giftCard.count({ where }),
    db.giftCard.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        redemptions: {
          orderBy: { redeemedAt: "desc" },
          take: 5,
        },
        _count: {
          select: { redemptions: true },
        },
      },
    }),
  ]);

  const items: GiftCardItem[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    initialBalance: Number(r.initialBalance),
    currentBalance: Number(r.currentBalance),
    currency: r.currency,
    buyerName: r.buyerName,
    buyerEmail: r.buyerEmail,
    recipientName: r.recipientName,
    recipientEmail: r.recipientEmail,
    recipientPhone: r.recipientPhone,
    message: r.message,
    status: r.status,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    totalRedemptions: r._count.redemptions,
    redemptions: r.redemptions.map((red) => ({
      id: red.id,
      amount: Number(red.amount),
      redeemedAt: red.redeemedAt.toISOString(),
      bookingId: red.bookingId,
      notes: red.notes,
    })),
  }));

  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

/** Consulta detalhes e saldo de um vale pelo código */
export async function getGiftCardByCode(companySlug: string, code: string) {
  if (!code || !code.trim()) return null;

  const normalizedCode = code.trim().toUpperCase();

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true },
  });
  if (!company) return null;

  const card = await db.giftCard.findFirst({
    where: {
      companyId: company.id,
      code: normalizedCode,
    },
  });

  if (!card) return null;

  // Verifica expiração
  if (card.expiresAt && new Date(card.expiresAt) < new Date() && card.status === "ACTIVE") {
    await db.giftCard.update({
      where: { id: card.id },
      data: { status: "EXPIRED" },
    });
    card.status = "EXPIRED";
  }

  return {
    id: card.id,
    code: card.code,
    initialBalance: Number(card.initialBalance),
    currentBalance: Number(card.currentBalance),
    currency: card.currency,
    recipientName: card.recipientName,
    status: card.status,
    expiresAt: card.expiresAt ? card.expiresAt.toISOString() : null,
    isValid: card.status === "ACTIVE" && Number(card.currentBalance) > 0,
  };
}
