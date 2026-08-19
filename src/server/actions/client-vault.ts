"use server";

import { db } from "@/lib/db";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { canAccessModule } from "@/lib/module-guard";
import { getActiveSession } from "@/lib/session";
import { deleteR2Object } from "@/lib/r2";
import { logAuditEvent } from "@/lib/audit-log";
import {
  VAULT_MODULE,
  computeRetainUntil,
  isPhotoKind,
  isServiceRecordEmpty,
} from "@/lib/client-vault";

/**
 * Cofre do cliente — escrita.
 *
 * Módulo licenciado: `canAccessModule` cobre acesso à empresa E contrato do
 * módulo. Foto de rosto de cliente é o conteúdo mais sensível que este produto
 * guarda, e não pode depender de o item estar escondido do menu.
 */

type Result = { success: true } | { success: false; error: string };

const photoSchema = z.object({
  customerId: z.string().min(1),
  bookingId: z.string().min(1).optional().nullable(),
  professionalId: z.string().min(1).optional().nullable(),
  storageKey: z.string().min(1).max(300),
  kind: z.string().refine(isPhotoKind, "Tipo de foto inválido"),
  caption: z.string().trim().max(200).optional().nullable(),
  /**
   * Confirmação de que o cliente autorizou o registro fotográfico.
   *
   * É `true` obrigatório, não booleano opcional: uma caixa que pode chegar
   * `false` e mesmo assim gravar a foto não é consentimento, é formulário.
   */
  consentConfirmed: z.literal(true),
});

export type AddPhotoInput = z.input<typeof photoSchema>;

export async function addClientPhotoAction(
  companySlug: string,
  input: AddPhotoInput
): Promise<Result> {
  const access = await canAccessModule(companySlug, VAULT_MODULE);
  if (!access.ok) return { success: false, error: access.error };

  const session = await getActiveSession();
  if (!session) return { success: false, error: "Não autenticado" };

  const parsed = photoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  // O cliente precisa ser DESTA empresa. Sem esta checagem, um id de outra
  // empresa penduraria a foto no cofre dela.
  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, companyId: access.companyId },
    select: { id: true },
  });
  if (!customer) return { success: false, error: "Cliente não encontrado" };

  const company = await db.company.findUnique({
    where: { id: access.companyId },
    select: { photoRetentionMonths: true },
  });

  const now = new Date();

  await db.clientPhoto.create({
    data: {
      companyId: access.companyId,
      customerId: customer.id,
      bookingId: parsed.data.bookingId ?? null,
      professionalId: parsed.data.professionalId ?? null,
      storageKey: parsed.data.storageKey,
      kind: parsed.data.kind,
      caption: parsed.data.caption?.trim() || null,
      consentAt: now,
      consentById: session.user.id,
      retainUntil: computeRetainUntil(now, company?.photoRetentionMonths ?? 24),
    },
  });

  await logAuditEvent({
    companyId: access.companyId,
    action: "CLIENT_PHOTO_ADDED",
    entity: "ClientPhoto",
    details: { customerId: customer.id, kind: parsed.data.kind },
  });

  revalidatePath(`/${companySlug}/clientes/${customer.id}/cofre`);
  return { success: true };
}

/**
 * Apaga a foto do armazenamento e depois o registro.
 *
 * Nesta ordem, e não na inversa. Apagar a linha primeiro e falhar no
 * armazenamento deixaria o arquivo no R2 sem nenhum registro apontando para
 * ele: invisível para o produto, existente para sempre, e impossível de
 * localizar quando o cliente pedir a exclusão por escrito.
 *
 * Se o armazenamento falhar, a operação falha inteira e o operador vê o erro.
 * "Apagado" precisa significar apagado.
 */
export async function deleteClientPhotoAction(
  companySlug: string,
  photoId: string
): Promise<Result> {
  const access = await canAccessModule(companySlug, VAULT_MODULE);
  if (!access.ok) return { success: false, error: access.error };

  const photo = await db.clientPhoto.findFirst({
    where: { id: photoId, companyId: access.companyId },
    select: { id: true, storageKey: true, customerId: true },
  });
  if (!photo) return { success: false, error: "Foto não encontrada" };

  try {
    await deleteR2Object(photo.storageKey);
  } catch (err) {
    console.error("[client-vault] falha ao apagar do armazenamento:", err);
    return {
      success: false,
      error: "Não foi possível apagar o arquivo. O registro foi mantido para nova tentativa.",
    };
  }

  await db.clientPhoto.delete({ where: { id: photo.id } });

  await logAuditEvent({
    companyId: access.companyId,
    action: "CLIENT_PHOTO_DELETED",
    entity: "ClientPhoto",
    details: { photoId: photo.id, customerId: photo.customerId },
  });

  revalidatePath(`/${companySlug}/clientes/${photo.customerId}/cofre`);
  return { success: true };
}

const recordSchema = z.object({
  customerId: z.string().min(1),
  bookingId: z.string().min(1).optional().nullable(),
  professionalId: z.string().min(1).optional().nullable(),
  formula: z.string().trim().max(300).optional().nullable(),
  developer: z.string().trim().max(120).optional().nullable(),
  processingMinutes: z.coerce.number().int().min(0).max(600).optional().nullable(),
  clipperGuard: z.string().trim().max(120).optional().nullable(),
  productsUsed: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type ServiceRecordInput = z.input<typeof recordSchema>;

export async function saveServiceRecordAction(
  companySlug: string,
  input: ServiceRecordInput,
  recordId?: string
): Promise<Result> {
  const access = await canAccessModule(companySlug, VAULT_MODULE);
  if (!access.ok) return { success: false, error: access.error };

  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  if (isServiceRecordEmpty(parsed.data)) {
    return { success: false, error: "Preencha ao menos um campo da ficha." };
  }

  const customer = await db.customer.findFirst({
    where: { id: parsed.data.customerId, companyId: access.companyId },
    select: { id: true },
  });
  if (!customer) return { success: false, error: "Cliente não encontrado" };

  // Campo vazio grava nulo. String vazia apareceria como sugestão em branco no
  // autocomplete do próximo atendimento.
  const data = {
    formula: parsed.data.formula?.trim() || null,
    developer: parsed.data.developer?.trim() || null,
    processingMinutes: parsed.data.processingMinutes ?? null,
    clipperGuard: parsed.data.clipperGuard?.trim() || null,
    productsUsed: parsed.data.productsUsed?.trim() || null,
    notes: parsed.data.notes?.trim() || null,
    professionalId: parsed.data.professionalId ?? null,
  };

  if (recordId) {
    const existing = await db.serviceRecord.findFirst({
      where: { id: recordId, companyId: access.companyId },
      select: { id: true },
    });
    if (!existing) return { success: false, error: "Ficha não encontrada" };

    await db.serviceRecord.update({ where: { id: existing.id }, data });
  } else {
    await db.serviceRecord.create({
      data: {
        ...data,
        companyId: access.companyId,
        customerId: customer.id,
        bookingId: parsed.data.bookingId ?? null,
      },
    });
  }

  revalidatePath(`/${companySlug}/clientes/${customer.id}/cofre`);
  return { success: true };
}

export async function deleteServiceRecordAction(
  companySlug: string,
  recordId: string
): Promise<Result> {
  const access = await canAccessModule(companySlug, VAULT_MODULE);
  if (!access.ok) return { success: false, error: access.error };

  const record = await db.serviceRecord.findFirst({
    where: { id: recordId, companyId: access.companyId },
    select: { id: true, customerId: true },
  });
  if (!record) return { success: false, error: "Ficha não encontrada" };

  await db.serviceRecord.delete({ where: { id: record.id } });

  revalidatePath(`/${companySlug}/clientes/${record.customerId}/cofre`);
  return { success: true };
}
