"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type Result = { success: true } | { success: false; error: string };

async function requireMember(companySlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Não autenticado" as const };

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, isActive: true, company: { slug: companySlug } },
    include: { company: { select: { id: true } } },
  });

  if (!member || (member.role !== "OWNER" && member.role !== "MANAGER")) {
    return { error: "Sem permissão" as const };
  }

  return { member };
}

export async function addAgendaExceptionAction(formData: FormData): Promise<Result> {
  const companySlug = (formData.get("companySlug") as string) ?? "";
  const ctx = await requireMember(companySlug);
  if ("error" in ctx) return { success: false, error: ctx.error as string };

  const agendaId    = formData.get("agendaId") as string;
  const date        = formData.get("date") as string;
  const type        = (formData.get("type") as string) === "CUSTOM_HOURS" ? "CUSTOM_HOURS" : "BLOCKED_DAY";
  const reason      = (formData.get("reason") as string)?.trim() || null;
  const startTime   = type === "CUSTOM_HOURS" ? (formData.get("startTime") as string) || null : null;
  const endTime     = type === "CUSTOM_HOURS" ? (formData.get("endTime") as string) || null : null;

  if (!agendaId || !date) return { success: false, error: "Dados incompletos" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: "Data inválida" };

  // Verify agenda belongs to this company
  const agenda = await db.agenda.findFirst({
    where: { id: agendaId, companyId: ctx.member.company.id },
  });
  if (!agenda) return { success: false, error: "Agenda não encontrada" };

  await db.agendaException.upsert({
    where: { agendaId_date: { agendaId, date } },
    update: { type: type as "BLOCKED_DAY" | "CUSTOM_HOURS", reason, startTime, endTime },
    create: { agendaId, date, type: type as "BLOCKED_DAY" | "CUSTOM_HOURS", reason, startTime, endTime },
  });

  revalidatePath(`/${companySlug}/agendas`);
  return { success: true };
}

export async function removeAgendaExceptionAction(
  exceptionId: string,
  companySlug: string
): Promise<Result> {
  const ctx = await requireMember(companySlug);
  if ("error" in ctx) return { success: false, error: ctx.error as string };

  const exception = await db.agendaException.findFirst({
    where: { id: exceptionId, agenda: { companyId: ctx.member.company.id } },
  });
  if (!exception) return { success: false, error: "Exceção não encontrada" };

  await db.agendaException.delete({ where: { id: exceptionId } });
  revalidatePath(`/${companySlug}/agendas`);
  return { success: true };
}
