"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

type SubmitResult = { success: true } | { success: false; error: string };

export async function submitReviewAction(formData: FormData): Promise<SubmitResult> {
  const bookingId = formData.get("bookingId") as string;
  const ratingRaw = parseInt((formData.get("rating") as string) ?? "0", 10);
  const comment = ((formData.get("comment") as string) ?? "").trim() || null;

  if (!bookingId) return { success: false, error: "ID do agendamento inválido" };
  if (ratingRaw < 1 || ratingRaw > 5) return { success: false, error: "Avaliação deve ser entre 1 e 5" };

  // Auth check must come before rate limit to avoid wasting quota for unauthenticated requests
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return { success: false, error: "Você precisa estar logado para avaliar" };

  // Rate limit: 5 reviews per minute per user
  const rl = await rateLimit(`review:${session.user.id}`, 5, 60);
  if (!rl.allowed) return { success: false, error: "Muitas tentativas. Aguarde um momento." };

  const booking = await db.booking.findFirst({
    where: { id: bookingId, status: "COMPLETED" },
    include: {
      customerDetail: { select: { firstName: true, lastName: true } },
      estimate: { select: { customerId: true } },
    },
  });

  if (!booking) return { success: false, error: "Agendamento não encontrado ou não concluído" };

  // Verify the logged-in user is the customer who made this booking
  if (booking.estimate.customerId !== session.user.id) {
    return { success: false, error: "Você só pode avaliar seus próprios agendamentos" };
  }

  const existing = await db.review.findUnique({ where: { bookingId } });
  if (existing) return { success: false, error: "Este agendamento já foi avaliado" };

  const reviewerName = booking.customerDetail
    ? `${booking.customerDetail.firstName} ${booking.customerDetail.lastName}`
    : null;

  await db.review.create({
    data: {
      companyId: booking.companyId,
      bookingId,
      rating: ratingRaw,
      comment,
      reviewerName,
    },
  });

  return { success: true };
}
