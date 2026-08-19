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
import { callGeminiOrGroq } from "@/lib/ai/gemini-client";

/**
 * Server Action: Processa texto/áudio em linguagem natural para agendamento inteligente
 * Utiliza Google Gemini 2.0 Flash / Groq com fallback para o motor determinístico local.
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
        name: true,
        services: {
          select: {
            id: true,
            name: true,
            serviceTypes: { select: { id: true, name: true, price: true, estimatedMinutes: true } },
          },
        },
        professionals: { select: { id: true, name: true } },
      },
    });

    if (!company) {
      return { success: false, error: "Empresa não encontrada." };
    }

    const flatServices = company.services.flatMap((s) =>
      s.serviceTypes.map((st) => ({
        id: st.id,
        name: `${s.name} - ${st.name}`,
        price: Number(st.price),
        duration: st.estimatedMinutes,
      }))
    );

    // 1. Tentar processamento inteligente com LLM (Google Gemini Flash / Groq)
    const systemPrompt = `Você é uma assistente de agendamento inteligente para o estabelecimento "${company.name}".
Serviços disponíveis: ${JSON.stringify(flatServices)}
Profissionais disponíveis: ${JSON.stringify(company.professionals)}
Data atual de referência: ${new Date().toISOString().split("T")[0]}

Analise o pedido do cliente e retorne APENAS um JSON válido no seguinte formato:
{
  "matchedServiceName": "nome do serviço correspondente ou null",
  "matchedProfessionalName": "nome do profissional correspondente ou null",
  "targetDateStr": "YYYY-MM-DD ou null",
  "exactTime": "HH:mm ou null",
  "timePreference": "MANHA" | "TARDE" | "NOITE" | "QUALQUER",
  "confidenceScore": número de 70 a 99
}`;

    const llmResponse = await callGeminiOrGroq(`Pedido do cliente: "${userQuery}"`, systemPrompt);

    if (llmResponse) {
      try {
        const parsed = JSON.parse(llmResponse);
        if (parsed.matchedServiceName || parsed.targetDateStr || parsed.exactTime) {
          return {
            success: true,
            data: {
              rawQuery: userQuery,
              matchedServiceName: parsed.matchedServiceName || undefined,
              matchedProfessionalName: parsed.matchedProfessionalName || undefined,
              targetDateStr: parsed.targetDateStr || undefined,
              exactTime: parsed.exactTime || undefined,
              timePreference: parsed.timePreference || "QUALQUER",
              confidenceScore: parsed.confidenceScore || 95,
            },
          };
        }
      } catch (e) {
        console.warn("[AI_JSON_PARSE_FALLBACK] Utilizando parser determinístico local...", e);
      }
    }

    // 2. Fallback Determinístico Local (100% resiliente e sempre funcional)
    const localIntent = parseNaturalLanguageBooking(
      userQuery,
      flatServices,
      company.professionals
    );

    return { success: true, data: localIntent };
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
    const totalNoShow = bookings.filter((b: { status: string }) => b.status === "NO_SHOW").length;

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
 * Server Action: Gera copy de campanha de retenção por IA (WhatsApp + E-mail)
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
    // 1. Tentar gerar com Gemini/Groq se disponível
    const prompt = `Gere uma mensagem amigável e persuasiva de WhatsApp e um e-mail para reconquistar o cliente "${clientName}" que não realiza um agendamento há ${daysInactive} dias.${lastServiceName ? ` O último serviço realizado foi "${lastServiceName}".` : ""}
Retorne APENAS um JSON no formato:
{
  "whatsappCopy": "texto da mensagem com emojis e link para agendamento",
  "emailSubject": "assunto do e-mail",
  "emailBody": "corpo do e-mail"
}`;

    const llmResponse = await callGeminiOrGroq(prompt);
    if (llmResponse) {
      try {
        const parsed = JSON.parse(llmResponse);
        if (parsed.whatsappCopy) {
          return { success: true, data: parsed };
        }
      } catch (e) {
        // segue para fallback
      }
    }

    // 2. Fallback com templates determinísticos ricos
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
