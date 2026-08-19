/**
 * Motor Operacional: Ghost Slot Buster (Preenchedor de Vagas Ociosas de Última Hora)
 * Transforma cancelamentos e desistências de última hora em Ofertas Relâmpago com Desconto Dinâmico.
 */

export interface GhostSlotOffer {
  bookingId: string;
  professionalId: string;
  professionalName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  originalPrice: number;
  discountPercentage: number;
  flashPrice: number;
  minutesUntilStart: number;
  expiresInMinutes: number;
}

/**
 * Avalia se um horário cancelado/ocioso qualifica como vaga de última hora e calcula o desconto ideal.
 * Regra:
 * - 0 a 60 min antes do horário: 25% OFF (Desconto máximo para não perder a hora)
 * - 60 a 120 min antes: 20% OFF
 * - 120 a 180 min antes: 15% OFF
 */
export function calculateGhostSlotDiscount(
  scheduledDateTime: Date,
  currentDateTime: Date = new Date(),
  basePrice: number = 80
): { isGhostSlot: boolean; discountPercentage: number; flashPrice: number; minutesUntilStart: number } {
  const diffMs = scheduledDateTime.getTime() - currentDateTime.getTime();
  const minutesUntilStart = Math.round(diffMs / (1000 * 60));

  // Apenas vagas no futuro próximo (entre 10 min e 180 min)
  if (minutesUntilStart < 10 || minutesUntilStart > 180) {
    return {
      isGhostSlot: false,
      discountPercentage: 0,
      flashPrice: basePrice,
      minutesUntilStart,
    };
  }

  let discountPercentage = 15;
  if (minutesUntilStart <= 60) {
    discountPercentage = 25;
  } else if (minutesUntilStart <= 120) {
    discountPercentage = 20;
  }

  const flashPrice = Math.round(basePrice * (1 - discountPercentage / 100) * 100) / 100;

  return {
    isGhostSlot: true,
    discountPercentage,
    flashPrice,
    minutesUntilStart,
  };
}
