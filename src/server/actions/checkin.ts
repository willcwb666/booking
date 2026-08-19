"use server";

import "server-only";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { calculateDistanceMeters, formatDistance } from "@/lib/geo/haversine";
import { verifySignedCheckinToken, generateSignedCheckinToken } from "@/lib/security/signed-token";

/** Antecedência máxima para abrir o check-in. */
const CHECKIN_EARLY_WINDOW_MINUTES = 15;
/** Atraso máximo tolerado antes de mandar o cliente à recepção. */
const CHECKIN_LATE_WINDOW_MINUTES = 30;

export interface CheckinBookingData {
  id: string;
  code: string;
  status: string;
  scheduledTime: string; // ISO string para serialização do client
  scheduledDate: string;
  scheduledStartTime: string;
  customerName: string;
  serviceName: string;
  professionalName: string;
  companyName: string;
  companySlug: string;
  companyAddress: string | null;
  companyLat?: number;
  companyLon?: number;
  radiusMeters: number;
  windowMinutes: number;
  checkedInAt?: string;
  distanceMeters?: number;
}

export type CheckinStatusResult =
  | { success: true; message: string; distanceFormatted?: string; status: "CHECKED_IN" | "ALREADY_CHECKED_IN" }
  | { success: false; error: string; code: "TOO_EARLY" | "TOO_LATE" | "OUT_OF_RANGE" | "INVALID_STATUS" | "ERROR"; distanceFormatted?: string; allowedDistance?: string; minutesLeft?: number };

/**
 * Busca as informações do agendamento para a tela de Check-in
 */
export async function getBookingCheckinInfoAction(
  bookingId: string,
  token?: string,
  expTimestamp?: number
): Promise<{ success: boolean; data?: CheckinBookingData; error?: string }> {
  try {
    // Token OBRIGATÓRIO. Antes a verificação era `if (token && expTimestamp)`:
    // bastava omitir os parâmetros para ler nome, telefone e e-mail do cliente
    // de QUALQUER agendamento, só conhecendo o id. Esta action é pública (a
    // página /checkin não exige login), então o token é a única credencial.
    if (!token || !expTimestamp) {
      return { success: false, error: "Link de check-in inválido ou incompleto." };
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            phone: true,
            timezone: true,
            latitude: true,
            longitude: true,
            checkinRadiusMeters: true,
          },
        },
        professional: {
          select: {
            id: true,
            name: true,
          },
        },
        customerDetail: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        estimate: {
          include: {
            serviceTypes: {
              include: {
                serviceType: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return { success: false, error: "Agendamento não encontrado." };
    }

    const tokenVerification = verifySignedCheckinToken(
      booking.id,
      booking.companyId,
      token,
      expTimestamp
    );
    if (!tokenVerification.valid) {
      return { success: false, error: tokenVerification.reason || "Acesso de check-in não autorizado." };
    }

    const serviceName =
      booking.estimate?.serviceTypes?.map((st) => st.serviceType.name).join(" + ") || "Atendimento Personalizado";

    const customerName = booking.customerDetail
      ? `${booking.customerDetail.firstName} ${booking.customerDetail.lastName}`.trim()
      : "Cliente";

    // Constrói a data/hora aproximada de referência
    const scheduledDateTime = new Date(`${booking.scheduledDate}T${booking.scheduledStartTime}:00`);

    return {
      success: true,
      data: {
        id: booking.id,
        code: booking.id.slice(-6).toUpperCase(),
        status: booking.status,
        scheduledTime: scheduledDateTime.toISOString(),
        scheduledDate: booking.scheduledDate,
        scheduledStartTime: booking.scheduledStartTime,
        customerName,
        serviceName,
        professionalName: booking.professional?.name || "Profissional",
        companyName: booking.company.name,
        companySlug: booking.company.slug,
        companyAddress: booking.company.address || "Recepção principal",
        // Coordenadas reais da empresa. `undefined` quando ela ainda não
        // cadastrou o endereço geográfico — aí a tela não pede localização.
        companyLat: booking.company.latitude ?? undefined,
        companyLon: booking.company.longitude ?? undefined,
        radiusMeters: booking.company.checkinRadiusMeters,
        windowMinutes: CHECKIN_EARLY_WINDOW_MINUTES,
        checkedInAt: booking.checkedInAt?.toISOString(),
      },
    };
  } catch (error) {
    console.error("[CHECKIN_INFO_ERROR]", error);
    return { success: false, error: "Erro ao carregar dados do agendamento." };
  }
}

/**
 * Executa o Check-in Inteligente com Validação Dupla (Tempo + Proximidade GPS)
 */
export async function performSmartCheckinAction(
  bookingId: string,
  clientCoords?: { latitude: number; longitude: number },
  token?: string,
  expTimestamp?: number
): Promise<CheckinStatusResult> {
  try {
    // Mesma regra da leitura: sem token válido não há check-in. A action é
    // alcançável por qualquer um, então o link assinado é a credencial.
    if (!token || !expTimestamp) {
      return { success: false, error: "Link de check-in inválido ou incompleto.", code: "ERROR" };
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            latitude: true,
            longitude: true,
            checkinRadiusMeters: true,
          },
        },
        professional: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!booking) {
      return { success: false, error: "Agendamento não encontrado.", code: "ERROR" };
    }

    const tokenVerification = verifySignedCheckinToken(
      booking.id,
      booking.companyId,
      token,
      expTimestamp
    );
    if (!tokenVerification.valid) {
      return {
        success: false,
        error: tokenVerification.reason || "Acesso de check-in não autorizado.",
        code: "ERROR",
      };
    }

    // Segundo check-in no mesmo agendamento devolve sucesso em vez de erro:
    // o cliente costuma reabrir o link do WhatsApp para conferir se deu certo.
    if (booking.checkedInAt) {
      return {
        success: true,
        status: "ALREADY_CHECKED_IN",
        message: "Sua chegada já estava registrada. Pode aguardar, avisamos a equipe.",
      };
    }

    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      return {
        success: false,
        error: `Este agendamento já foi ${booking.status === "COMPLETED" ? "concluído" : "cancelado"}.`,
        code: "INVALID_STATUS",
      };
    }

    // 1. Validação de Janela de Tempo
    const now = new Date();
    const scheduled = new Date(`${booking.scheduledDate}T${booking.scheduledStartTime}:00`);
    const diffMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);

    // Muito cedo
    if (diffMinutes > CHECKIN_EARLY_WINDOW_MINUTES) {
      const minutesLeft = Math.round(diffMinutes - CHECKIN_EARLY_WINDOW_MINUTES);
      return {
        success: false,
        error: `O check-in abre ${CHECKIN_EARLY_WINDOW_MINUTES} minutos antes do seu horário.`,
        code: "TOO_EARLY",
        minutesLeft,
      };
    }

    // Muito tarde
    if (diffMinutes < -CHECKIN_LATE_WINDOW_MINUTES) {
      return {
        success: false,
        error: `A janela de check-in automático para este horário já expirou. Por favor, apresente-se na recepção.`,
        code: "TOO_LATE",
      };
    }

    // 2. Cerca geográfica — só quando a EMPRESA tem coordenadas cadastradas.
    //    Antes o ponto de referência era fixo (-25.4284, -49.2733, Curitiba),
    //    então qualquer estabelecimento fora dali recusava todos os clientes
    //    por "distância" — e um cliente em Curitiba passava em qualquer salão
    //    do país.
    let calculatedDistance: number | undefined = undefined;
    const { latitude: companyLat, longitude: companyLon } = booking.company;
    const maxRadiusMeters = booking.company.checkinRadiusMeters;

    if (
      companyLat != null &&
      companyLon != null &&
      clientCoords &&
      Number.isFinite(clientCoords.latitude) &&
      Number.isFinite(clientCoords.longitude)
    ) {
      calculatedDistance = calculateDistanceMeters(clientCoords, {
        latitude: companyLat,
        longitude: companyLon,
      });

      if (calculatedDistance > maxRadiusMeters) {
        return {
          success: false,
          error: `Você está a ${formatDistance(calculatedDistance)} do local. Aproxime-se (o check-in vale num raio de ${formatDistance(maxRadiusMeters)}).`,
          code: "OUT_OF_RANGE",
          distanceFormatted: formatDistance(calculatedDistance),
          allowedDistance: formatDistance(maxRadiusMeters),
        };
      }
    }

    // 3. Registra a chegada. `updateMany` com guarda em `checkedInAt` nulo:
    //    dois toques rápidos no botão não geram duas escritas.
    const updated = await db.booking.updateMany({
      where: { id: bookingId, checkedInAt: null },
      data: {
        status: "CONFIRMED",
        checkedInAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return {
        success: true,
        status: "ALREADY_CHECKED_IN",
        message: "Sua chegada já estava registrada.",
      };
    }

    revalidatePath(`/${booking.company.slug}/agendamentos`);
    revalidatePath(`/checkin/${bookingId}`);

    return {
      success: true,
      status: "CHECKED_IN",
      message: `Check-in confirmado com sucesso! O profissional ${booking.professional?.name || ""} já foi avisado da sua chegada.`,
      distanceFormatted: calculatedDistance ? formatDistance(calculatedDistance) : undefined,
    };
  } catch (error) {
    console.error("[SMART_CHECKIN_ERROR]", error);
    return { success: false, error: "Não foi possível concluir o check-in. Tente novamente ou fale com a recepção.", code: "ERROR" };
  }
}

// `createSignedCheckinUrlAction` foi REMOVIDA daqui.
//
// Ela recebia um bookingId e um companyId quaisquer e devolvia uma URL de
// check-in ASSINADA, sem verificar nada. Uma assinatura so vale enquanto a
// emissao e controlada: com o emissor aberto ao publico, qualquer pessoa
// conseguia um token valido para o agendamento de qualquer cliente — e a tela
// de check-in mostra dados do cliente.
//
// Nao havia nenhum chamador no projeto. Quando o envio por WhatsApp/SMS
// existir, o link deve ser gerado no servidor, dentro do fluxo que ja
// verificou o acesso a empresa, e nunca por uma action publica.
