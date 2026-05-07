"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: true } | { success: false; error: string };

export async function updateProfileAction(formData: FormData): Promise<Result> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const name = (formData.get("name") as string)?.trim();
  const bio = (formData.get("bio") as string)?.trim() || null;
  const location = (formData.get("location") as string)?.trim() || null;

  if (!name) return { success: false, error: "Nome é obrigatório" };
  if (name.length > 100) return { success: false, error: "Nome muito longo (máx. 100 caracteres)" };

  await db.user.update({
    where: { id: session.user.id },
    data: { name, bio, location },
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function changePasswordAction(formData: FormData): Promise<Result> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: "Não autenticado" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: "Preencha todos os campos" };
  }
  if (newPassword.length < 8) {
    return { success: false, error: "A nova senha deve ter pelo menos 8 caracteres" };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, error: "As senhas não coincidem" };
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: { currentPassword, newPassword, revokeOtherSessions: false },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Senha atual incorreta" };
  }
}
