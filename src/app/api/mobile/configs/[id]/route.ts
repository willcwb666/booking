import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const config = await db.bookingConfig.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      agenda: {
        select: {
          id: true,
          startDate: true,
          endDate: true,
          workingDays: true,
          startTime: true,
          endTime: true,
          intervalMinutes: true,
        },
      },
      serviceTypes: {
        include: {
          serviceType: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              estimatedMinutes: true,
            },
          },
        },
      },
      extraServices: {
        include: {
          extraService: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              estimatedMinutes: true,
            },
          },
        },
      },
    },
  });

  if (!config) {
    return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    id: config.id,
    name: config.name,
    companyId: config.companyId,
    agendaId: config.agendaId,
    allowPartialService: config.allowPartialService,
    agenda: config.agenda,
    serviceTypes: config.serviceTypes.map((st) => ({
      id: st.serviceType.id,
      name: st.serviceType.name,
      description: st.serviceType.description,
      price: st.serviceType.price,
      estimatedMinutes: st.serviceType.estimatedMinutes,
    })),
    extraServices: config.extraServices.map((es) => ({
      id: es.extraService.id,
      name: es.extraService.name,
      description: es.extraService.description,
      price: es.extraService.price,
      estimatedMinutes: es.extraService.estimatedMinutes,
    })),
  });
}
