"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { verifySignedReviewToken } from "@/lib/security/signed-token";
import { sendLowRatingAlertEmail } from "@/lib/email";
import { LOW_RATING_THRESHOLD } from "@/lib/review-policy";

/**
 * Avaliação por link assinado — sem login.
 *
 * ─── Por que sem login ───────────────────────────────────────────────────────
 *
 * `submitReviewAction` exige sessão e casa o avaliador com `estimate.customerId`.
 * Isso só funciona para quem criou conta, que é a minoria: barbearia, pet shop e
 * oficina agendam com nome e telefone. Na prática, o recurso de avaliação
 * alcançava quase ninguém. O token assinado no e-mail faz o papel da sessão,
 * como já acontece no check-in.
 *
 * ─── O que NÃO é feito aqui ──────────────────────────────────────────────────
 *
 * Não há filtro de nota antes do Google. Todo mundo que avalia recebe o convite
 * para o Google Meu Negócio, inclusive quem deu uma estrela. Filtrar — "review
 * gating" — viola a política do Google Business Profile e a regra da FTC de
 * 2024; a punição possível é a remoção do perfil da empresa do Maps. Seria
 * vender, como recurso, algo capaz de apagar a presença do cliente no Google.
 *
 * O que o produto entrega no lugar: o gerente recebe alerta imediato de nota
 * baixa e tem chance de resolver antes — em PARALELO ao convite, não no lugar
 * dele.
 *
 * Também não há sugestão de texto pronto para o cliente postar. Avaliação
 * escrita pela empresa é avaliação não-autêntica, proibida pelas mesmas regras.
 */

export type ReviewLinkInfo =
  | {
      valid: true;
      companyName: string;
      serviceName: string;
      scheduledDate: string;
      customerName: string;
      alreadyReviewed: boolean;
      googleReviewUrl: string | null;
    }
  | { valid: false; error: string };

export async function getReviewLinkInfoAction(
  bookingId: string,
  token: string,
  expires: string
): Promise<ReviewLinkInfo> {
  // Endpoint público: sem sessão para responsabilizar, o limite é a única
  // barreira contra varredura de bookingId.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.REVIEW, ip);
  if (!rl.allowed) return { valid: false, error: rl.message };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      companyId: true,
      scheduledDate: true,
      status: true,
      company: { select: { name: true, googleReviewUrl: true } },
      bookingConfig: { select: { name: true } },
      customerDetail: { select: { firstName: true } },
      review: { select: { id: true } },
    },
  });
  if (!booking) return { valid: false, error: "Agendamento não encontrado." };

  const check = verifySignedReviewToken(
    bookingId,
    booking.companyId,
    token,
    Number(expires)
  );
  if (!check.valid) return { valid: false, error: check.reason ?? "Link inválido." };

  if (booking.status !== "COMPLETED") {
    return { valid: false, error: "Este atendimento ainda não foi concluído." };
  }

  return {
    valid: true,
    companyName: booking.company.name,
    serviceName: booking.bookingConfig.name,
    scheduledDate: booking.scheduledDate,
    customerName: booking.customerDetail?.firstName ?? "",
    alreadyReviewed: booking.review !== null,
    googleReviewUrl: booking.company.googleReviewUrl,
  };
}

export type SubmitByLinkResult =
  | { success: true; googleReviewUrl: string | null; isLowRating: boolean }
  | { success: false; error: string };

export async function submitReviewByLinkAction(
  bookingId: string,
  token: string,
  expires: string,
  rating: number,
  comment: string
): Promise<SubmitByLinkResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.REVIEW, ip);
  if (!rl.allowed) return { success: false, error: rl.message };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: "Escolha uma nota de 1 a 5." };
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      companyId: true,
      status: true,
      scheduledDate: true,
      company: { select: { name: true, googleReviewUrl: true } },
      bookingConfig: { select: { name: true } },
      customerDetail: { select: { firstName: true, lastName: true, phone: true } },
      review: { select: { id: true } },
    },
  });
  if (!booking) return { success: false, error: "Agendamento não encontrado." };

  const check = verifySignedReviewToken(bookingId, booking.companyId, token, Number(expires));
  if (!check.valid) return { success: false, error: check.reason ?? "Link inválido." };

  if (booking.status !== "COMPLETED") {
    return { success: false, error: "Este atendimento ainda não foi concluído." };
  }
  if (booking.review) {
    return { success: false, error: "Este atendimento já foi avaliado." };
  }

  const reviewerName = booking.customerDetail
    ? `${booking.customerDetail.firstName} ${booking.customerDetail.lastName}`.trim()
    : null;

  const isLowRating = rating <= LOW_RATING_THRESHOLD;

  const review = await db.review.create({
    data: {
      companyId: booking.companyId,
      bookingId,
      rating,
      comment: comment.trim() || null,
      reviewerName,
      source: "LINK",
    },
    select: { id: true },
  });

  // Alerta ao gerente em PARALELO ao convite para o Google, nunca no lugar
  // dele. É esta parte que dá ao dono a chance de resolver em minutos em vez
  // de descobrir na nota pública — sem esconder nada de ninguém.
  if (isLowRating) {
    const managers = await db.companyUser.findMany({
      where: {
        companyId: booking.companyId,
        isActive: true,
        role: { in: ["OWNER", "MANAGER"] },
      },
      select: { user: { select: { email: true, name: true } } },
    });

    let alerted = false;
    for (const m of managers) {
      try {
        await sendLowRatingAlertEmail({
          to: m.user.email,
          managerName: m.user.name || m.user.email,
          companyName: booking.company.name,
          customerName: reviewerName || "Cliente",
          customerPhone: booking.customerDetail?.phone ?? null,
          serviceName: booking.bookingConfig.name,
          scheduledDate: booking.scheduledDate,
          rating,
          comment: comment.trim() || null,
        });
        alerted = true;
      } catch (err) {
        console.error("[review] falha ao alertar gerente:", err);
      }
    }

    if (alerted) {
      await db.review.update({
        where: { id: review.id },
        data: { alertSentAt: new Date() },
      });
    }
  }

  return {
    success: true,
    // Devolvido para QUALQUER nota. Ver a nota no topo do arquivo.
    googleReviewUrl: booking.company.googleReviewUrl,
    isLowRating,
  };
}
