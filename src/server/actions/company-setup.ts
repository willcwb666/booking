import "server-only";
import { db } from "@/lib/db";
import { findActiveSystemPresets } from "@/lib/system-preset-db";
import { ensureDefaultPresetsSeeded } from "@/lib/seed-presets";

export async function seedCompanyDefaults(params: {
  companyId: string;
  slug: string;
  businessType: string;
  userId: string;
  userName?: string | null;
}) {
  const { companyId, slug, businessType, userId, userName } = params;

  try {
    // 1. Garantir que os presets padrão estejam no banco
    await ensureDefaultPresetsSeeded();

    // 2. Buscar presets ativos para este segmento
    const presets = await findActiveSystemPresets(businessType);

    const createdServiceTypeIds: string[] = [];
    const createdExtraServiceIds: string[] = [];

    if (presets.length > 0) {
      let orderIndex = 0;
      for (const p of presets) {
        if (!p.isExtra) {
          const srv = await db.service.create({
            data: {
              companyId,
              name: p.title,
              description: p.description || null,
              order: orderIndex++,
              isActive: true,
            },
          });

          const st = await db.serviceType.create({
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

          createdServiceTypeIds.push(st.id);
        } else {
          const extra = await db.extraService.create({
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

          createdExtraServiceIds.push(extra.id);
        }
      }
    }

    // 3. Criar profissional inicial (o próprio gestor/dono)
    const professional = await db.professional.create({
      data: {
        companyId,
        userId,
        name: userName || "Profissional Principal",
        commissionPercentage: 50,
        isActive: true,
      },
    });

    // 4. Criar Agenda Principal Ativa (Segunda a Sábado, 09h às 19h)
    const todayStr = new Date().toISOString().split("T")[0];
    const agenda = await db.agenda.create({
      data: {
        companyId,
        name: "Agenda Principal",
        status: "ACTIVE",
        startDate: todayStr,
        workingDays: [1, 2, 3, 4, 5, 6],
        startTime: "09:00",
        endTime: "19:00",
        intervalMinutes: 30,
        createdById: userId,
        professionals: {
          create: {
            professionalId: professional.id,
          },
        },
      },
    });

    // 5. Criar Configuração de Agendamento Online Publicada e vinculada aos serviços
    await db.bookingConfig.create({
      data: {
        companyId,
        agendaId: agenda.id,
        name: "Agendamento Online",
        status: "PUBLISHED",
        createdById: userId,
        serviceTypes: {
          create: createdServiceTypeIds.map((id) => ({ serviceTypeId: id })),
        },
        extraServices: {
          create: createdExtraServiceIds.map((id) => ({ extraServiceId: id })),
        },
      },
    });
  } catch (err) {
    console.error(`[seedCompanyDefaults] Erro ao popular dados padrão para "${slug}":`, err);
  }
}
