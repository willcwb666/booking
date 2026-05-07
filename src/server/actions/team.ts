"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: true } | { success: false; error: string };

async function requireOwner(companySlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Não autenticado" };

  const member = await db.companyUser.findFirst({
    where: {
      userId: session.user.id,
      company: { slug: companySlug },
      isActive: true,
    },
    include: { company: { select: { id: true } } },
  });
  if (!member) return { error: "Acesso negado" };

  return { session, member };
}

export async function inviteMemberAction(
  companySlug: string,
  email: string
): Promise<Result> {
  const ctx = await requireOwner(companySlug);
  if ("error" in ctx) return { success: false, error: ctx.error! };

  if (ctx.member.role !== "OWNER" && ctx.member.role !== "MANAGER") {
    return { success: false, error: "Apenas OWNER ou MANAGER podem convidar membros" };
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) return { success: false, error: "E-mail inválido" };

  const targetUser = await db.user.findUnique({ where: { email: trimmedEmail } });
  if (!targetUser) {
    return { success: false, error: "Nenhuma conta encontrada com este e-mail" };
  }

  const companyId = ctx.member.company.id;

  const existing = await db.companyUser.findUnique({
    where: { companyId_userId: { companyId, userId: targetUser.id } },
  });

  if (existing) {
    if (existing.isActive) {
      return { success: false, error: "Este usuário já é membro da equipe" };
    }
    // Reactivate
    await db.companyUser.update({
      where: { id: existing.id },
      data: { isActive: true, role: "EMPLOYEE" },
    });
  } else {
    await db.companyUser.create({
      data: {
        companyId,
        userId: targetUser.id,
        role: "EMPLOYEE",
        isActive: true,
      },
    });
  }

  revalidatePath(`/${companySlug}/equipe`);
  return { success: true };
}

export async function changeRoleAction(
  companySlug: string,
  memberId: string,
  newRole: "MANAGER" | "EMPLOYEE"
): Promise<Result> {
  const ctx = await requireOwner(companySlug);
  if ("error" in ctx) return { success: false, error: ctx.error! };

  if (ctx.member.role !== "OWNER") {
    return { success: false, error: "Apenas OWNER pode alterar roles" };
  }

  const target = await db.companyUser.findFirst({
    where: { id: memberId, company: { slug: companySlug } },
  });
  if (!target) return { success: false, error: "Membro não encontrado" };

  if (target.userId === ctx.session!.user.id) {
    return { success: false, error: "Não é possível alterar o próprio role" };
  }

  if (target.role === "OWNER") {
    return { success: false, error: "Não é possível alterar o role de outro OWNER" };
  }

  await db.companyUser.update({
    where: { id: memberId },
    data: { role: newRole },
  });

  revalidatePath(`/${companySlug}/equipe`);
  return { success: true };
}

export async function removeMemberAction(
  companySlug: string,
  memberId: string
): Promise<Result> {
  const ctx = await requireOwner(companySlug);
  if ("error" in ctx) return { success: false, error: ctx.error! };

  if (ctx.member.role !== "OWNER") {
    return { success: false, error: "Apenas OWNER pode remover membros" };
  }

  const target = await db.companyUser.findFirst({
    where: { id: memberId, company: { slug: companySlug } },
  });
  if (!target) return { success: false, error: "Membro não encontrado" };

  if (target.userId === ctx.session!.user.id) {
    return { success: false, error: "Não é possível remover a si mesmo" };
  }

  if (target.role === "OWNER") {
    return { success: false, error: "Não é possível remover outro OWNER" };
  }

  await db.companyUser.update({
    where: { id: memberId },
    data: { isActive: false },
  });

  revalidatePath(`/${companySlug}/equipe`);
  return { success: true };
}
