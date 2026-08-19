"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveSession } from "@/lib/session";

/**
 * Perfil pessoal do usuário — o preenchimento em um toque.
 *
 * Todas as operações são sobre o PRÓPRIO perfil: o id do usuário sai da sessão
 * e nunca é parâmetro. Aceitar um `userId` aqui transformaria a action num
 * leitor da agenda alheia — é a mesma classe de falha que esta base já teve.
 */

const profileSchema = z.object({
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(160).optional(),
  aptNo: z.string().trim().max(30).optional(),
  city: z.string().trim().max(80).optional(),
  zip: z.string().trim().max(20).optional(),
});

export type UserProfileInput = z.infer<typeof profileSchema>;

type Result = { success: true } | { success: false; error: string };

export async function saveUserProfileAction(input: UserProfileInput): Promise<Result> {
  const session = await getActiveSession();
  if (!session) return { success: false, error: "Não autenticado" };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // Campo vazio grava nulo em vez de string vazia: é a diferença entre "não
  // informei" e "informei nada", e só a primeira deve deixar o formulário em
  // branco no próximo checkout.
  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v && v.length > 0 ? v : null])
  );

  await db.userProfile.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  revalidatePath("/minha-conta");
  return { success: true };
}

/**
 * Apaga o perfil.
 *
 * Existe porque guardar endereço de alguém sem uma forma óbvia de remover é
 * indefensável — e porque a pessoa pode ter preenchido por engano e não querer
 * que aquilo apareça no próximo checkout. Não afeta as fichas já criadas nas
 * empresas: aquelas são registros delas, sobre atendimentos que aconteceram.
 */
export async function deleteUserProfileAction(): Promise<Result> {
  const session = await getActiveSession();
  if (!session) return { success: false, error: "Não autenticado" };

  await db.userProfile.deleteMany({ where: { userId: session.user.id } });

  revalidatePath("/minha-conta");
  return { success: true };
}
