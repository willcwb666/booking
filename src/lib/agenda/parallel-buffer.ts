/**
 * Motor de Otimização de Recursos Paralelos (Parallel Resource Buffer)
 * Divide serviços complexos em etapas para permitir encaixes inteligentes na cadeira principal durante pausas.
 */

export interface ServiceStep {
  name: string;
  durationMinutes: number;
  resourceRequired: "MAIN_CHAIR" | "WASH_AREA" | "WAITING_LOUNGE";
  isTechnicianRequired: boolean;
}

export interface StagedServiceConfig {
  serviceId: string;
  serviceName: string;
  steps: ServiceStep[];
}

export interface ParallelGapSlot {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  availableMinutes: number;
  canFitServiceDuration: number;
}

/**
 * Analisa as etapas de um atendimento e encontra janelas de liberação da cadeira principal
 */
export function findParallelGapSlots(
  appointmentStartTime: string, // "14:00"
  steps: ServiceStep[]
): ParallelGapSlot[] {
  const gaps: ParallelGapSlot[] = [];

  const [startHour, startMin] = appointmentStartTime.split(":").map(Number);
  let currentOffsetMinutes = startHour * 60 + startMin;

  for (const step of steps) {
    const stepStartMin = currentOffsetMinutes;
    const stepEndMin = stepStartMin + step.durationMinutes;

    // Se o recurso principal estiver LIVRE (ex: cliente foi para área de lavatório ou espera técnica)
    if (step.resourceRequired !== "MAIN_CHAIR" && !step.isTechnicianRequired) {
      const formatTime = (mins: number) => {
        const h = String(Math.floor(mins / 60)).padStart(2, "0");
        const m = String(mins % 60).padStart(2, "0");
        return `${h}:${m}`;
      };

      gaps.push({
        startTime: formatTime(stepStartMin),
        endTime: formatTime(stepEndMin),
        availableMinutes: step.durationMinutes,
        canFitServiceDuration: Math.max(0, step.durationMinutes - 5), // 5 min de margem
      });
    }

    currentOffsetMinutes = stepEndMin;
  }

  return gaps;
}
