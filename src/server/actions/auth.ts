"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { loginSchema, registerSchema } from "@/schemas/auth.schema";
import type { ActionResult } from "@/types";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { getUserCompanies } from "@/server/queries/companies";

import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
async function redirectAfterAuth(userId: string): Promise<never> {
  const companies = await getUserCompanies(userId);
  if (companies.length > 0) {
    redirect(`/${companies[0].company.slug}/dashboard`);
  }
  redirect("/onboarding");
}

export async function registerAction(
  formData: FormData
): Promise<ActionResult> {
  // O limite de brute-force do projeto está no handler HTTP `/api/auth`.
  // Esta action chama a API do better-auth em processo e não passa por lá,
  // então precisa do próprio limite — senão é uma porta paralela aberta.
  const rlIp =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.AUTH, rlIp);
  if (!rl.allowed) return { success: false, errors: { _: [rl.message] } };

  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  let userId: string;
  try {
    const result = await auth.api.signUpEmail({ body: parsed.data });
    userId = result.user.id;
  } catch (e) {
    const message = e instanceof APIError ? e.message : "Erro ao criar conta";
    return { success: false, errors: { email: [message] } };
  }

  return redirectAfterAuth(userId);
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  // Mesmo motivo do cadastro: esta action chama `auth.api.signInEmail` em
  // processo e nunca passa pelo handler HTTP onde o limite de brute-force
  // está aplicado.
  const rlIp =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await enforceRateLimit(RATE_LIMITS.AUTH, rlIp);
  if (!rl.allowed) return { success: false, errors: { _: [rl.message] } };

  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  let userId: string;
  try {
    const result = await auth.api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
    userId = result.user.id;
  } catch (e) {
    const message = e instanceof APIError ? e.message : "Credenciais inválidas";
    return { success: false, errors: { email: [message] } };
  }

  return redirectAfterAuth(userId);
}

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
