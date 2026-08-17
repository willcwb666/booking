"use server";

import "server-only";
import { db } from "@/lib/db";
import {
  parseNaturalLanguageBooking,
  calculateNoShowRisk,
  generateAIRetentionCampaign,
  type ParsedBookingIntent,
  type NoShowRiskAnalysis,
} from "@/lib/ai/booking-copilot";

/**
 * Server Action: Processa texto em linguagem natural para agendamento automático
 */
export async function parseAIBookingIntentAction(
  companySlug: string,
  userQuery: string
): Promise<{ success: boolean; data?: ParsedBookingIntent; error?: string }> {
  try {
    if (!userQuery || userQuery.trim().length < 3) {
      return { success: false, error: "Digite pelo menos 3 caracteres para a IA analisar." };
    }

    const company = await db.company.findUnique({
      where: { slug: companySlug },
      select: {
        id: true,
        services: { select: { id: true, name: true } },
        professionals: { select: { id: true, name: true } },
      },
    });

    if (!company) {
      return { success: false, error: "Empresa não encontrada." };
    }

    const intent = parseNaturalLanguageBooking(
      userQuery,
      company.services,
      company.professionals
    );

    return { success: true, data: intent };
  } catch (error) {
    console.error("[AI_COPILOT_ERROR]", error);
    return { success: false, error: "Erro ao processar com a IA. Tente novamente." };
  }
}

/**
 * Server Action: Avalia risco de no-show para um cliente específico
 */
export async function evaluateClientNoShowRiskAction(
  companySlug: string,
  clientEmailOrPhone: string
): Promise<{ success: boolean; data?: NoShowRiskAnalysis; error?: string }> {
  try {
    const company = await db.company.findUnique({
      where: { slug: companySlug },
      select: { id: true },
    });

    if (!company) {
      return { success: false, error: "Empresa não encontrada." };
    }

    // Busca histórico real de agendamentos via relação customerDetail
    const bookings = await db.booking.findMany({
      where: {
        companyId: company.id,
        customerDetail: {
          OR: [
            { email: clientEmailOrPhone },
            { phone: clientEmailOrPhone },
          ],
        },
      },
      select: { status: true },
    });

    const totalCompleted = bookings.filter((b: { status: string }) => b.status === "COMPLETED").length;
    const totalCancelled = bookings.filter((b: { status: string }) => b.status === "CANCELLED").length;
    const totalNoShow = 0;

    const risk = calculateNoShowRisk({
      totalCompleted,
      totalCancelled,
      totalNoShow,
      bookingLeadHours: 24,
      isWeekend: false,
      isPeakHour: false,
    });

    return { success: true, data: risk };
  } catch (error) {
    console.error("[AI_RISK_EVAL_ERROR]", error);
    return { success: false, error: "Erro ao calcular score de risco." };
  }
}

/**
 * Server Action: Gera copy de campanha de retenção por IA
 */
export async function generateAIRetentionCampaignAction(
  clientName: string,
  daysInactive: number,
  lastServiceName?: string
): Promise<{
  success: boolean;
  data?: { whatsappCopy: string; emailSubject: string; emailBody: string };
  error?: string;
}> {
  try {
    const campaign = generateAIRetentionCampaign({
      clientName,
      daysInactive,
      lastServiceName,
    });

    return { success: true, data: campaign };
  } catch (error) {
    console.error("[AI_CAMPAIGN_ERROR]", error);
    return { success: false, error: "Erro ao gerar campanha de IA." };
  }
}
