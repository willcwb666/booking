import { z } from "zod";

const RESERVED_SLUGS = ["admin", "login", "register", "onboarding", "api", "book", "404", "500"];

export const BUSINESS_TYPES = [
  { value: "HOME_CLEANING", label: "Home Cleaning" },
  { value: "PET_GROOMER",   label: "Pet Groomer" },
  { value: "CAR_WASH",      label: "Car Wash" },
  { value: "POOL_CLEANING", label: "Pool Cleaning" },
  { value: "LAWN_CARE",     label: "Lawn Care" },
  { value: "BARBER",        label: "Barber" },
  { value: "HAIR_SALON",    label: "Hair Salon" },
  { value: "PHOTOGRAPHER",  label: "Photographer" },
  { value: "OTHER",         label: "Other" },
] as const;

export type BusinessTypeValue = (typeof BUSINESS_TYPES)[number]["value"];

export const createCompanySchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(100),
  businessType: z.enum(BUSINESS_TYPES.map((b) => b.value) as [string, ...string[]]),
  planId: z.string().min(1, "Selecione um plano"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}
