"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { withCompanyAuth } from "@/lib/server-action";
import type { ActionResult } from "@/types";

export async function updateProfessionalCommissionAction(
  companySlug: string,
  professionalId: string,
  commissionPercentage: number
): Promise<ActionResult<{ commissionPercentage: number }>> {
  return withCompanyAuth(companySlug, "MANAGER", async ({ company }) => {
    if (commissionPercentage < 0 || commissionPercentage > 100) {
      return { success: false, errors: { _: ["A porcentagem de comissão deve estar entre 0% e 100%"] } };
    }

    const professional = await db.professional.findFirst({
      where: { id: professionalId, companyId: company.id },
    });

    if (!professional) {
      return { success: false, errors: { _: ["Profissional não encontrado"] } };
    }

    await db.professional.update({
      where: { id: professionalId },
      data: { commissionPercentage },
    });

    revalidatePath(`/${companySlug}/comissoes`);
    revalidatePath(`/${companySlug}/profissionais`);
    revalidatePath(`/${companySlug}/equipe`);

    return { success: true, data: { commissionPercentage } };
  });
}
