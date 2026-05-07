"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { loginSchema, registerSchema } from "@/schemas/auth.schema";
import type { ActionResult } from "@/types";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { getUserCompanies } from "@/server/queries/companies";

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
