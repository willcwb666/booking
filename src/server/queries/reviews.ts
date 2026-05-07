import "server-only";
import { db } from "@/lib/db";

export type ReviewListItem = {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string | null;
  bookingId: string;
  scheduledDate: string;
  createdAt: Date;
};

export async function getReviews(companyId: string, page = 1, pageSize = 20) {
  const where = { companyId };
  const [total, rows] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { booking: { select: { scheduledDate: true } } },
    }),
  ]);

  const items: ReviewListItem[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    reviewerName: r.reviewerName,
    bookingId: r.bookingId,
    scheduledDate: r.booking.scheduledDate,
    createdAt: r.createdAt,
  }));

  return { items, total, page, pageCount: Math.ceil(total / pageSize) };
}

export async function getReviewStats(companyId: string) {
  const result = await db.review.aggregate({
    where: { companyId },
    _avg: { rating: true },
    _count: { id: true },
  });
  return {
    average: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : null,
    count: result._count.id,
  };
}
