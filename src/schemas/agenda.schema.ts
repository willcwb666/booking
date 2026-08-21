import { z } from "zod";
import { todayInTimezone } from "@/lib/company-date";

const TIME_REGEX = /^\d{2}:\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A agenda, validada.
 *
 * ─── Por que virou fabrica ───────────────────────────────────────────────────
 *
 * Era uma constante, e a regra "inicio nao pode ser no passado" comparava com
 * `new Date().toISOString().slice(0, 10)` — o dia do SERVIDOR, em UTC. Em
 * qualquer fuso negativo o servidor vira o dia antes do salao: as 18h de
 * Denver ja e o dia seguinte em UTC, e o dono que tentasse criar uma agenda
 * comecando HOJE era recusado com "data anterior a hoje". A trava bloqueava o
 * uso legitimo, que e a direcao pior de errar.
 *
 * ─── E por que `currentStartDate` ────────────────────────────────────────────
 *
 * A mesma regra rodava na EDICAO. Uma agenda que ja comecou tem, por
 * definicao, data de inicio no passado — entao qualquer tentativa de editar
 * uma agenda ativa era recusada pelo campo que o dono nem estava mexendo.
 * Alterar o horario de funcionamento de uma agenda em uso era simplesmente
 * impossivel.
 *
 * Passando a data atual da agenda, manter o valor continua valendo; MOVER o
 * inicio para o passado segue proibido.
 */
export function makeAgendaSchema(opts?: {
  /** Fuso da empresa. Sem ele, o dia do servidor. */
  timezone?: string;
  /** Data de inicio ja gravada, na edicao. */
  currentStartDate?: string;
}) {
  const timezone = opts?.timezone;
  const currentStartDate = opts?.currentStartDate;
  return z
  .object({
    name: z.string().min(1, "Nome obrigatório").max(100, "Máximo 100 caracteres"),
    startDate: z.string().regex(DATE_REGEX, "Data inválida"),
    endDate: z
      .string()
      .regex(DATE_REGEX, "Data inválida")
      .optional()
      .or(z.literal("")),
    workingDays: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, "Selecione ao menos 1 dia da semana"),
    startTime: z.string().regex(TIME_REGEX, "Horário inválido"),
    endTime: z.string().regex(TIME_REGEX, "Horário inválido"),
    intervalMinutes: z.coerce
      .number({ error: "Intervalo inválido" })
      .refine((v) => v === 30 || v === 60, "Intervalo deve ser 30 ou 60 minutos"),
    professionalIds: z.array(z.string()).optional().default([]),
  })
  .superRefine((data, ctx) => {
    const today = todayInTimezone(timezone ?? "UTC");
    const mantendoOInicio = currentStartDate !== undefined && data.startDate === currentStartDate;
    if (!mantendoOInicio && data.startDate < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data de início não pode ser anterior a hoje",
        path: ["startDate"],
      });
    }
    if (data.endDate && data.endDate !== "" && data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data de término deve ser posterior à data de início",
        path: ["endDate"],
      });
    }
    if (data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Horário de término deve ser posterior ao horário de início",
        path: ["endTime"],
      });
    }
  });
}

/** Compatibilidade: mesma validacao, com o dia do servidor. */
export const agendaSchema = makeAgendaSchema();

export type AgendaInput = z.infer<ReturnType<typeof makeAgendaSchema>>;
