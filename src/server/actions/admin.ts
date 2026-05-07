"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: true } | { success: false; error: string };

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Não autenticado" };
  if (session.user.role !== "admin") return { error: "Acesso negado" };
  return { userId: session.user.id };
}

export async function toggleCompanyActiveAction(
  companyId: string
): Promise<Result> {
  const check = await requireAdmin();
  if ("error" in check) return { success: false, error: check.error };

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) return { success: false, error: "Empresa não encontrada" };

  await db.company.update({
    where: { id: companyId },
    data: { isActive: !company.isActive },
  });

  revalidatePath("/admin/companies");
  return { success: true };
}

export async function banUserAction(
  userId: string,
  reason: string
): Promise<Result> {
  const check = await requireAdmin();
  if ("error" in check) return { success: false, error: check.error };

  if (userId === check.userId)
    return { success: false, error: "Não é possível banir a si mesmo" };

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { banned: true, banReason: reason || null },
    }),
    // Invalidate all active sessions so the user is immediately logged out
    db.session.deleteMany({ where: { userId } }),
  ]);

  revalidatePath("/admin/users");
  return { success: true };
}

export async function unbanUserAction(userId: string): Promise<Result> {
  const check = await requireAdmin();
  if ("error" in check) return { success: false, error: check.error };

  await db.user.update({
    where: { id: userId },
    data: { banned: false, banReason: null, banExpires: null },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleUserAdminAction(userId: string): Promise<Result> {
  const check = await requireAdmin();
  if ("error" in check) return { success: false, error: check.error };

  if (userId === check.userId)
    return { success: false, error: "Não é possível alterar o próprio role" };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "Usuário não encontrado" };

  const newRole = user.role === "admin" ? null : "admin";
  await db.user.update({ where: { id: userId }, data: { role: newRole } });

  revalidatePath("/admin/users");
  return { success: true };
}
