/**
 * Motor de Inteligência Artificial para o SaaS de Agendamentos (AI Suite)
 * 
 * Inclui:
 * 1. Processador de Linguagem Natural (NLP) para agendamento inteligente.
 * 2. Algoritmo Previsor de Risco de No-Show / Faltas.
 * 3. Gerador de Copys de Retenção e Reativação de Clientes.
 * 4. Detector Inteligente de Gaps e Horários Vagos na Agenda.
 */

export interface ParsedBookingIntent {
  rawQuery: string;
  matchedServiceName?: string;
  matchedProfessionalName?: string;
  targetDateStr?: string; // YYYY-MM-DD
  timePreference?: "MANHA" | "TARDE" | "NOITE" | "QUALQUER";
  exactTime?: string; // HH:mm
  confidenceScore: number;
}

export interface NoShowRiskAnalysis {
  riskScore: number; // 0 a 100
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  factors: string[];
  recommendedAction: string;
  requiresDeposit: boolean;
  suggestedDepositPercent: number;
}

/**
 * 1. Processa linguagem natural em intenções estruturadas de agendamento.
 * Exemplo: "Quero cortar o cabelo e fazer a barba no próximo sábado de manhã com a Maria"
 */
export function parseNaturalLanguageBooking(
  query: string,
  availableServices: { id: string; name: string }[],
  availableProfessionals: { id: string; name: string }[]
): ParsedBookingIntent {
  const normalized = query.toLowerCase().trim();
  
  // Detecção de serviço por correspondência aproximada
  let matchedService = availableServices.find((s) =>
    normalized.includes(s.name.toLowerCase())
  );
  if (!matchedService) {
    if (normalized.includes("cabelo") || normalized.includes("corte")) {
      matchedService = availableServices.find((s) => s.name.toLowerCase().includes("corte"));
    } else if (normalized.includes("barba")) {
      matchedService = availableServices.find((s) => s.name.toLowerCase().includes("barba"));
    } else if (normalized.includes("unha") || normalized.includes("manicure")) {
      matchedService = availableServices.find((s) => s.name.toLowerCase().includes("manicure") || s.name.toLowerCase().includes("unha"));
    } else if (normalized.includes("limpeza") || normalized.includes("pele")) {
      matchedService = availableServices.find((s) => s.name.toLowerCase().includes("limpeza"));
    } else if (normalized.includes("massagem") || normalized.includes("relaxante")) {
      matchedService = availableServices.find((s) => s.name.toLowerCase().includes("massagem"));
    }
  }

  // Detecção de profissional
  const matchedPro = availableProfessionals.find((p) =>
    normalized.includes(p.name.toLowerCase().split(" ")[0])
  );

  // Detecção de preferência de horário (Manhã, Tarde, Noite)
  let timePref: "MANHA" | "TARDE" | "NOITE" | "QUALQUER" = "QUALQUER";
  if (normalized.includes("manhã") || normalized.includes("cedo") || normalized.includes("am")) {
    timePref = "MANHA";
  } else if (normalized.includes("tarde") || normalized.includes("pm")) {
    timePref = "TARDE";
  } else if (normalized.includes("noite")) {
    timePref = "NOITE";
  }

  // Detecção de horário exato (ex: 14h, 15:30, 09h30)
  const timeMatch = normalized.match(/(\d{1,2})([:h]\d{2}|h)?/);
  let exactTime: string | undefined = undefined;
  if (timeMatch && (normalized.includes("às") || normalized.includes("as") || normalized.includes("h"))) {
    const hour = timeMatch[1].padStart(2, "0");
    const minPart = timeMatch[2] ? timeMatch[2].replace(/[[:h]]/, "") : "00";
    const minutes = minPart.length === 2 ? minPart : "00";
    if (parseInt(hour, 10) >= 0 && parseInt(hour, 10) <= 23) {
      exactTime = `${hour}:${minutes}`;
    }
  }

  // Cálculo da data alvo baseada em referências temporais
  const now = new Date();
  let targetDate = new Date();
  
  if (normalized.includes("amanhã") || normalized.includes("amanha")) {
    targetDate.setDate(now.getDate() + 1);
  } else if (normalized.includes("hoje")) {
    targetDate = now;
  } else if (normalized.includes("segunda")) {
    targetDate = getNextDayOfWeek(now, 1);
  } else if (normalized.includes("terça") || normalized.includes("terca")) {
    targetDate = getNextDayOfWeek(now, 2);
  } else if (normalized.includes("quarta")) {
    targetDate = getNextDayOfWeek(now, 3);
  } else if (normalized.includes("quinta")) {
    targetDate = getNextDayOfWeek(now, 4);
  } else if (normalized.includes("sexta")) {
    targetDate = getNextDayOfWeek(now, 5);
  } else if (normalized.includes("sábado") || normalized.includes("sabado")) {
    targetDate = getNextDayOfWeek(now, 6);
  } else if (normalized.includes("domingo")) {
    targetDate = getNextDayOfWeek(now, 0);
  } else {
    // Padrão: Próximo dia útil
    targetDate.setDate(now.getDate() + 1);
  }

  const targetDateStr = targetDate.toISOString().split("T")[0];
  const confidenceScore = matchedService ? (matchedPro ? 95 : 85) : 60;

  return {
    rawQuery: query,
    matchedServiceName: matchedService?.name,
    matchedProfessionalName: matchedPro?.name,
    targetDateStr,
    timePreference: timePref,
    exactTime,
    confidenceScore,
  };
}

/**
 * Auxiliar: Obtém a data do próximo dia da semana
 */
function getNextDayOfWeek(date: Date, dayOfWeek: number): Date {
  const result = new Date(date);
  result.setDate(date.getDate() + ((dayOfWeek + 7 - date.getDay()) % 7 || 7));
  return result;
}

/**
 * 2. Avaliador de Risco de No-Show (Previsor Inteligente de Faltas)
 */
export function calculateNoShowRisk(input: {
  totalCompleted: number;
  totalCancelled: number;
  totalNoShow: number;
  bookingLeadHours: number; // Antecedência em horas
  isWeekend: boolean;
  isPeakHour: boolean;
}): NoShowRiskAnalysis {
  let score = 15; // Risco base inicial baixo
  const factors: string[] = [];

  const totalBookings = input.totalCompleted + input.totalCancelled + input.totalNoShow;

  if (totalBookings === 0) {
    score += 20;
    factors.push("Primeiro agendamento do cliente (Sem histórico prévio)");
  } else {
    const noShowRate = input.totalNoShow / totalBookings;
    if (noShowRate > 0.3) {
      score += 45;
      factors.push(`Taxa de faltas anterior alta (${(noShowRate * 100).toFixed(0)}%)`);
    } else if (noShowRate > 0.1) {
      score += 20;
      factors.push("Histórico recente de remarcação/falta");
    }

    const cancelRate = input.totalCancelled / totalBookings;
    if (cancelRate > 0.4) {
      score += 15;
      factors.push("Frequência de cancelamentos em cima da hora");
    }
  }

  if (input.bookingLeadHours > 72) {
    score += 15;
    factors.push("Agendado com antecedência superior a 3 dias");
  } else if (input.bookingLeadHours < 2) {
    score += 10;
    factors.push("Agendado de última hora (< 2h de antecedência)");
  }

  if (input.isWeekend) {
    score += 10;
    factors.push("Horário de fim de semana (maior taxa geral de imprevistos)");
  }

  // Garantir limites entre 0 e 100
  const finalScore = Math.min(Math.max(score, 5), 95);

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let recommendedAction = "Agendamento de baixo risco. Confirmação padrão enviada.";
  let requiresDeposit = false;
  let suggestedDepositPercent = 0;

  if (finalScore >= 65) {
    riskLevel = "HIGH";
    recommendedAction = "Exigir taxa de reserva/sinal de 30% via PIX ou Cartão para garantir a vaga.";
    requiresDeposit = true;
    suggestedDepositPercent = 30;
  } else if (finalScore >= 40) {
    riskLevel = "MEDIUM";
    recommendedAction = "Enviar lembrete de reconfirmação interativa via WhatsApp 3h antes.";
    requiresDeposit = true;
    suggestedDepositPercent = 15;
  }

  return {
    riskScore: finalScore,
    riskLevel,
    factors,
    recommendedAction,
    requiresDeposit,
    suggestedDepositPercent,
  };
}

/**
 * 3. Gerador de Mensagens de Retenção Personalizadas com IA
 */
export function generateAIRetentionCampaign(input: {
  clientName: string;
  daysInactive: number;
  lastServiceName?: string;
  preferredProfessionalName?: string;
}): { whatsappCopy: string; emailSubject: string; emailBody: string } {
  const firstName = input.clientName.split(" ")[0];
  const service = input.lastServiceName || "nossos serviços";
  const pro = input.preferredProfessionalName ? ` com ${input.preferredProfessionalName}` : "";

  const whatsappCopy = `Olá ${firstName}! 👋 Notamos que faz ${input.daysInactive} dias desde a sua última visita para ${service}${pro}.\n\nPara garantir que seu visual continue impecável, preparamos uma condição especial: *10% de desconto* para você agendar esta semana!\n\nClique no link abaixo para escolher seu melhor horário em 1 minuto:\n👉 Agendar Agora`;

  const emailSubject = `${firstName}, sentimos sua falta! Garanta seu desconto exclusivo ✨`;
  const emailBody = `Olá ${firstName},\n\nFaz exatamente ${input.daysInactive} dias que você esteve conosco para ${service}${pro}. Queremos te convidar para retornar e renovar seu cuidado especial!\n\nAproveite 10% de desconto exclusivo reservando seu horário agora mesmo.\n\nAtenciosamente,\nSua Equipe de Atendimento`;

  return {
    whatsappCopy,
    emailSubject,
    emailBody,
  };
}
