"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit";
import { findActiveSystemPresets } from "@/lib/system-preset-db";

/**
 * Reseta o catálogo de serviços de uma empresa para os valores padrão do preset do seu segmento.
 */
export async function resetCompanyPresetServicesAction(companyId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return { success: false, error: "Acesso negado — Apenas Super Admin da Plataforma" };
  }

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true, slug: true, businessType: true },
  });

  if (!company) return { success: false, error: "Empresa não encontrada" };

  try {
    // 1. Limpar serviços antigos da empresa
    await db.serviceType.deleteMany({ where: { companyId } });
    await db.extraService.deleteMany({ where: { companyId } });
    await db.service.deleteMany({ where: { companyId } });

    // 2. Criar Categoria Principal
    const serviceCategory = await db.service.create({
      data: {
        companyId,
        name: "Serviços do Segmento (Preset Restaurado)",
        description: "Catálogo padrão restaurado pelo Super Admin",
        order: 0,
      },
    });

    // 3. Buscar presets do banco para esse segmento via função resiliente
    const presets = await findActiveSystemPresets(company.businessType);

    if (presets.length > 0) {
      for (const p of presets) {
        if (!p.isExtra) {
          await db.serviceType.create({
            data: {
              companyId,
              serviceId: serviceCategory.id,
              name: p.title,
              description: p.description || null,
              price: p.defaultPrice,
              estimatedMinutes: p.durationMin,
              order: p.displayOrder,
              isActive: true,
            },
          });
        } else {
          await db.extraService.create({
            data: {
              companyId,
              name: p.title,
              description: p.description || null,
              price: p.defaultPrice,
              estimatedMinutes: p.durationMin || 15,
              order: p.displayOrder,
              isActive: true,
            },
          });
        }
      }
    }

    // 4. Criar notificação para a empresa informando a conclusão do reset
    const notifId = `snot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.$executeRawUnsafe(
      `
      INSERT INTO "system_notification" (
        id, "companyId", "recipientUserId", title, message, type, "isRead", "isResolved", "createdAt"
      ) VALUES (
        $1, $2, NULL, $3, $4, 'INFO', false, true, NOW()
      )
    `,
      notifId,
      companyId,
      `Reset de Presets Concluído! 🎉`,
      `Sua solicitação de reset do catálogo de serviços foi executada com sucesso pelo Super Admin. Seus novos presets padrão já estão aplicados e prontos para uso.`
    );

    await logAuditEvent({
      companyId,
      action: "SERVICE_CATALOG_RESET",
      entity: "Company",
      details: { businessType: company.businessType, restoredCount: presets.length },
    });

    revalidatePath(`/admin/companies`);
    revalidatePath(`/${company.slug}/dashboard`);

    return { success: true, message: "Catálogo de serviços resetado com sucesso para o preset padrão e notificação enviada à empresa!" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao resetar serviços da empresa";
    return { success: false, error: msg };
  }
}
