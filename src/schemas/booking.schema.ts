import { z } from "zod";

export const createBookingSchema = z.object({
  date: z.coerce.date().min(new Date(), "Data deve ser futura"),
  notes: z.string().max(500).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
