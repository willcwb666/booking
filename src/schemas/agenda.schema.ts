import { z } from "zod";

const TIME_REGEX = /^\d{2}:\d{2}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const agendaSchema = z
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
    const today = new Date().toISOString().slice(0, 10);
    if (data.startDate < today) {
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

export type AgendaInput = z.infer<typeof agendaSchema>;
