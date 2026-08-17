import "server-only";
import { db } from "@/lib/db";

export async function getServices(companyId: string) {
  return db.service.findMany({
    where: { companyId, isActive: true },
    include: {
      serviceTypes: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });
}

export async function getExtraServices(companyId: string) {
  return db.extraService.findMany({
    where: { companyId, isActive: true },
    orderBy: { order: "asc" },
  });
}

/**
 * Retorna todos os serviços reais da empresa para checkboxes de seleção no cadastro de profissionais.
 * Garante que nenhum nome de categoria genérica ("Preset Restaurado") apareça como item selecionável.
 */
export async function getAllCompanyServicesForSelect(companyId: string) {
  const [services, extraServices] = await Promise.all([
    db.service.findMany({
      where: { companyId, isActive: true },
      include: {
        serviceTypes: {
          where: { isActive: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.extraService.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const list: Array<{ id: string; name: string }> = [];

  for (const s of services) {
    if (s.name.includes("Preset Restaurado") || s.name.includes("Serviços do Segmento")) {
      // Se por algum motivo existir o container genérico no banco, extrai cada modalidade pelo nome real!
      for (const st of s.serviceTypes) {
        list.push({ id: st.id, name: st.name });
      }
    } else {
      list.push({ id: s.id, name: s.name });
    }
  }

  for (const e of extraServices) {
    list.push({ id: e.id, name: e.name });
  }

  return list;
}
