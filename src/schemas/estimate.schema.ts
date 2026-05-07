import { z } from "zod";

export const estimateItemSchema = z.object({
  serviceTypeId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const estimateSchema = z.object({
  bookingConfigId: z.string().min(1),
  serviceItems: z.array(estimateItemSchema).min(1, "Selecione pelo menos um serviço"),
  extraServiceIds: z.array(z.string()),
  frequency: z.enum(["ONCE", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
});
