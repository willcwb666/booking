"use server";

import { db } from "@/lib/db";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit-log";
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

    // 2. Buscar presets do banco para esse segmento
    const presets = await findActiveSystemPresets(company.businessType);

    if (presets.length > 0) {
      let orderIndex = 0;
      for (const p of presets) {
        if (!p.isExtra) {
          // Criar cada serviço do preset como um SERVIÇO REAL INDIVIDUAL
          const srv = await db.service.create({
            data: {
              companyId,
              name: p.title,
              description: p.description || null,
              order: orderIndex++,
              isActive: true,
            },
          });

          await db.serviceType.create({
            data: {
              companyId,
              serviceId: srv.id,
              name: p.title,
              description: p.description || null,
              price: p.defaultPrice,
              estimatedMinutes: p.durationMin || 30,
              order: 0,
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
              order: orderIndex++,
              isActive: true,
            },
          });
        }
      }
    }

    // 3. Criar notificação para a empresa informando a conclusão do reset
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
    revalidatePath(`/${company.slug}/servicos`);

    return { success: true, message: "Catálogo de serviços resetado com sucesso para o preset padrão e notificação enviada à empresa!" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao resetar serviços da empresa";
    return { success: false, error: msg };
  }
}
