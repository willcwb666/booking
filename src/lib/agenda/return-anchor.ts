/**
 * Motor de Retorno Dinâmico (Dynamic Return Anchor)
 * Calcula a data ideal de retorno com base no ciclo de consumo do serviço.
 */

export interface ReturnAnchorSuggestion {
  suggestedDate: string; // YYYY-MM-DD
  suggestedDateFormatted: string; // ex: "08 de Setembro (Sexta)"
  suggestedTime: string; // HH:MM
  cadenceDays: number;
  discountPercentage: number;
  message: string;
}

/**
 * Mapeamento padrão de frequência média de consumo por tipo de serviço
 */
const DEFAULT_SERVICE_CADENCE_DAYS: Record<string, number> = {
  corte: 21,
  barba: 14,
  cabelo: 21,
  manicure: 14,
  unha: 14,
  limpeza: 30,
  estetica: 30,
  massagem: 30,
  detailing: 45,
  lavagem: 15,
  pet: 21,
  default: 20,
};

/**
 * Calcula a data e o horário ideal do próximo agendamento do cliente
 */
export function calculateNextReturnDate(
  serviceName: string = "corte",
  currentAppointmentDate: Date = new Date(),
  habitualStartTime: string = "14:00"
): ReturnAnchorSuggestion {
  const normalized = serviceName.toLowerCase();

  let cadenceDays = DEFAULT_SERVICE_CADENCE_DAYS.default;
  for (const [key, days] of Object.entries(DEFAULT_SERVICE_CADENCE_DAYS)) {
    if (normalized.includes(key)) {
      cadenceDays = days;
      break;
    }
  }

  const nextDate = new Date(currentAppointmentDate);
  nextDate.setDate(nextDate.getDate() + cadenceDays);

  // Se cair no domingo (0), ajusta para a sexta anterior ou sábado
  if (nextDate.getDay() === 0) {
    nextDate.setDate(nextDate.getDate() - 1); // ajusta para sábado
  }

  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, "0");
  const day = String(nextDate.getDate()).padStart(2, "0");
  const suggestedDate = `${year}-${month}-${day}`;

  const formattedStr = nextDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return {
    suggestedDate,
    suggestedDateFormatted: formattedStr,
    suggestedTime: habitualStartTime,
    cadenceDays,
    discountPercentage: 10,
    message: `Seu ciclo habitual deste serviço é de ${cadenceDays} dias. Garanta sua vaga com 10% OFF.`,
  };
}
