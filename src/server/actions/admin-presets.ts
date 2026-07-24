"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/types";
import {
  createSystemPresetRecord,
  updateSystemPresetRecord,
  toggleSystemPresetActiveRecord,
  deleteSystemPresetRecord,
} from "@/lib/system-preset-db";

async function checkIsAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return false;
  }
  return true;
}

export async function createPresetAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!(await checkIsAdmin())) return { success: false, errors: { _: ["Acesso restrito ao Super Admin"] } };

  const businessType = formData.get("businessType") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const defaultPriceRaw = formData.get("defaultPrice") as string;
  const durationMinRaw = formData.get("durationMin") as string;
  const isExtra = formData.get("isExtra") === "true" || formData.get("isExtra") === "on";
  const parentTitle = (formData.get("parentTitle") as string)?.trim() || null;

  if (!businessType || !title) {
    return { success: false, errors: { title: ["Segmento e título são obrigatórios"] } };
  }

  const defaultPrice = parseFloat(defaultPriceRaw || "0");
  const durationMin = parseInt(durationMinRaw || "30", 10);

  await createSystemPresetRecord({
    businessType,
    title,
    description,
    defaultPrice: isNaN(defaultPrice) ? 0 : defaultPrice,
    durationMin: isNaN(durationMin) ? 30 : durationMin,
    isExtra,
    parentTitle: isExtra ? parentTitle : null,
    isActive: true,
  });

  revalidatePath("/admin/presets");
  return { success: true };
}

export async function updatePresetAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!(await checkIsAdmin())) return { success: false, errors: { _: ["Acesso restrito ao Super Admin"] } };

  const presetId = formData.get("presetId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const defaultPriceRaw = formData.get("defaultPrice") as string;
  const durationMinRaw = formData.get("durationMin") as string;
  const isExtra = formData.get("isExtra") === "true" || formData.get("isExtra") === "on";
  const parentTitle = (formData.get("parentTitle") as string)?.trim() || null;

  if (!presetId || !title) {
    return { success: false, errors: { title: ["ID e título são obrigatórios"] } };
  }

  const defaultPrice = parseFloat(defaultPriceRaw || "0");
  const durationMin = parseInt(durationMinRaw || "30", 10);

  await updateSystemPresetRecord(presetId, {
    title,
    description,
    defaultPrice: isNaN(defaultPrice) ? 0 : defaultPrice,
    durationMin: isNaN(durationMin) ? 30 : durationMin,
    isExtra,
    parentTitle: isExtra ? parentTitle : null,
  });

  revalidatePath("/admin/presets");
  return { success: true };
}

export async function togglePresetActiveAction(presetId: string, currentState: boolean): Promise<ActionResult> {
  if (!(await checkIsAdmin())) return { success: false, errors: { _: ["Acesso restrito ao Super Admin"] } };

  await toggleSystemPresetActiveRecord(presetId, currentState);

  revalidatePath("/admin/presets");
  return { success: true };
}

export async function deletePresetAction(presetId: string): Promise<ActionResult> {
  if (!(await checkIsAdmin())) return { success: false, errors: { _: ["Acesso restrito ao Super Admin"] } };

  await deleteSystemPresetRecord(presetId);

  revalidatePath("/admin/presets");
  return { success: true };
}
