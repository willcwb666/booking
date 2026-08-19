"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { withCompanyAuth } from "@/lib/server-action";
import type { ActionResult } from "@/types";

/**
 * Taxas de comissão de um profissional.
 *
 * Serviço e produto são valores independentes: o corte paga 50% e a pomada
 * 10%, e é a separação dos dois que permite fechar a quinzena sem planilha.
 *
 * Grava em `commissionRate`/`productCommissionRate` e mantém
 * `commissionPercentage` (campo legado) em sincronia, para que nenhuma leitura
 * antiga que ainda olhe só para ele mostre um número desatualizado. A ordem de
 * precedência na leitura está em `src/lib/commission-rates.ts`.
 */
export async function updateProfessionalCommissionAction(
  companySlug: string,
  professionalId: string,
  commissionPercentage: number,
  productCommissionPercentage = 0
): Promise<ActionResult<{ commissionPercentage: number; productCommissionPercentage: number }>> {
  return withCompanyAuth(companySlug, "MANAGER", async ({ company }) => {
    const invalid = (v: number) => !Number.isFinite(v) || v < 0 || v > 100;
    if (invalid(commissionPercentage) || invalid(productCommissionPercentage)) {
      return {
        success: false,
        errors: { _: ["As porcentagens de comissão devem estar entre 0% e 100%"] },
      };
    }

    const professional = await db.professional.findFirst({
      where: { id: professionalId, companyId: company.id },
      select: { id: true },
    });

    if (!professional) {
      return { success: false, errors: { _: ["Profissional não encontrado"] } };
    }

    await db.professional.update({
      where: { id: professionalId },
      data: {
        commissionPercentage,
        commissionRate: commissionPercentage,
        productCommissionRate: productCommissionPercentage,
      },
    });

    revalidatePath(`/${companySlug}/comissoes`);
    revalidatePath(`/${companySlug}/profissionais`);
    revalidatePath(`/${companySlug}/equipe`);

    return {
      success: true,
      data: { commissionPercentage, productCommissionPercentage },
    };
  });
}
