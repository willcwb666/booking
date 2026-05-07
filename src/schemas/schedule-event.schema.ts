import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const scheduleEventSchema = z
  .object({
    title: z.string().min(1, "Título obrigatório").max(150),
    type: z.enum(["APPOINTMENT", "EVENT", "ESTIMATE"]),
    date: z
      .string()
      .regex(DATE_RE, "Data inválida"),
    startTime: z
      .string()
      .regex(TIME_RE, "Hora de início inválida"),
    endTime: z
      .string()
      .regex(TIME_RE, "Hora de término inválida"),
    professionalId: z.string().optional(),
    notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endTime <= data.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Hora de término deve ser após a hora de início",
      });
    }
  });

export type ScheduleEventInput = z.infer<typeof scheduleEventSchema>;
