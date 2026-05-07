import { z } from "zod";

export const bookingConfigSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100),
  agendaId: z.string().min(1, "Agenda obrigatória"),
  allowPartialService: z.coerce.boolean().default(false),
  serviceTypeIds: z
    .array(z.string())
    .min(1, "Selecione pelo menos um tipo de serviço"),
  extraServiceIds: z.array(z.string()).default([]),
});

export type BookingConfigInput = z.infer<typeof bookingConfigSchema>;
