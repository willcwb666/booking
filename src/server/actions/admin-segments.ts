"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/types";
import {
  createSystemSegmentRecord,
  updateSystemSegmentRecord,
  toggleSystemSegmentActiveRecord,
  deleteSystemSegmentRecord,
} from "@/lib/system-segment-db";

async function checkIsAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return false;
  }
  return true;
}

export async function createSegmentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!(await checkIsAdmin())) return { success: false, errors: { _: ["Acesso restrito ao Super Admin"] } };

  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const label = (formData.get("label") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const displayOrderRaw = formData.get("displayOrder") as string;

  if (!code || !label) {
    return { success: false, errors: { label: ["Código e nome do segmento são obrigatórios"] } };
  }

  const displayOrder = parseInt(displayOrderRaw || "0", 10);

  await createSystemSegmentRecord({
    code,
    label,
    description,
    displayOrder: isNaN(displayOrder) ? 0 : displayOrder,
    isActive: true,
  });

  revalidatePath("/admin/segments");
  revalidatePath("/admin/presets");
  return { success: true };
}

export async function updateSegmentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!(await checkIsAdmin())) return { success: false, errors: { _: ["Acesso restrito ao Super Admin"] } };

  const segmentId = formData.get("segmentId") as string;
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const label = (formData.get("label") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const displayOrderRaw = formData.get("displayOrder") as string;

  if (!segmentId || !code || !label) {
    return { success: false, errors: { label: ["ID, código e nome são obrigatórios"] } };
  }

  const displayOrder = parseInt(displayOrderRaw || "0", 10);

  await updateSystemSegmentRecord(segmentId, {
    code,
    label,
    description,
    displayOrder: isNaN(displayOrder) ? 0 : displayOrder,
  });

  revalidatePath("/admin/segments");
  revalidatePath("/admin/presets");
  return { success: true };
}

export async function toggleSegmentActiveAction(segmentId: string, currentState: boolean): Promise<ActionResult> {
  if (!(await checkIsAdmin())) return { success: false, errors: { _: ["Acesso restrito ao Super Admin"] } };

  await toggleSystemSegmentActiveRecord(segmentId, currentState);

  revalidatePath("/admin/segments");
  revalidatePath("/admin/presets");
  return { success: true };
}

export async function deleteSegmentAction(segmentId: string): Promise<ActionResult> {
  if (!(await checkIsAdmin())) return { success: false, errors: { _: ["Acesso restrito ao Super Admin"] } };

  await deleteSystemSegmentRecord(segmentId);

  revalidatePath("/admin/segments");
  revalidatePath("/admin/presets");
  return { success: true };
}
