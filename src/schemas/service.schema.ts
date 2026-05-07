import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
});

export const serviceTypeSchema = z.object({
  serviceId: z.string().min(1, "Serviço obrigatório"),
  name: z.string().min(1, "Nome obrigatório").max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  price: z.coerce
    .number({ error: "Preço inválido" })
    .min(0, "Preço deve ser positivo"),
  estimatedMinutes: z.coerce
    .number({ error: "Duração inválida" })
    .int("Deve ser número inteiro")
    .min(1, "Duração mínima é 1 minuto"),
});

export const extraServiceSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  price: z.coerce
    .number({ error: "Preço inválido" })
    .min(0, "Preço deve ser positivo"),
  estimatedMinutes: z.coerce
    .number({ error: "Duração inválida" })
    .int("Deve ser número inteiro")
    .min(1, "Duração mínima é 1 minuto"),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
export type ServiceTypeInput = z.infer<typeof serviceTypeSchema>;
export type ExtraServiceInput = z.infer<typeof extraServiceSchema>;
