import { z } from "zod";

export const professionalSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100, "Máximo 100 caracteres"),
  email: z
    .string()
    .email("Email inválido")
    .max(255)
    .optional()
    .or(z.literal("")),
  phone: z.string().max(20, "Máximo 20 caracteres").optional().or(z.literal("")),
  bio: z.string().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
});

export type ProfessionalInput = z.infer<typeof professionalSchema>;
