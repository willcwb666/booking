import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const companySlug = searchParams.get("slug") ?? "";
  const from = searchParams.get("from") ?? "";
  const to   = searchParams.get("to")   ?? "";
  const status = searchParams.get("status") ?? "";

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, isActive: true, company: { slug: companySlug } },
    include: { company: { select: { id: true, name: true } } },
  });
  if (!member) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const where: Record<string, unknown> = { companyId: member.company.id };
  if (status && status !== "ALL") where.status = status;
  if (from) where.scheduledDate = { ...(where.scheduledDate as object ?? {}), gte: from };
  if (to)   where.scheduledDate = { ...(where.scheduledDate as object ?? {}), lte: to };

  const bookings = await db.booking.findMany({
    where,
    orderBy: [{ scheduledDate: "desc" }, { scheduledStartTime: "desc" }],
    include: {
      customerDetail: true,
      estimate: {
        select: {
          total: true,
          frequency: true,
          serviceTypes: { include: { serviceType: { select: { name: true } } } },
        },
      },
    },
    take: 5000,
  });

  const PAYMENT_LABELS: Record<string, string> = {
    CARD: "Cartão", CASH_CHECK: "Dinheiro/Cheque", PIX: "PIX",
  };
  const STATUS_LABELS: Record<string, string> = {
    PENDING: "Pendente", CONFIRMED: "Confirmado", IN_PROGRESS: "Em andamento",
    COMPLETED: "Concluído", CANCELLED: "Cancelado", RESCHEDULED: "Reagendado",
  };
  const PSTATUS_LABELS: Record<string, string> = {
    PENDING: "Aguardando", PAID: "Pago", FAILED: "Falhou", REFUNDED: "Reembolsado",
  };

  const header = [
    "ID", "Data", "Início", "Fim", "Status", "Pagamento", "Status Pagamento",
    "Valor (R$)", "Cliente", "E-mail", "Telefone", "Endereço", "Cidade", "CEP",
    "Serviços", "Frequência",
  ].join(";");

  const rows = bookings.map((b) => {
    const cd = b.customerDetail;
    const services = b.estimate.serviceTypes.map((s) => s.serviceType.name).join(", ");
    const cols = [
      b.id,
      b.scheduledDate.split("-").reverse().join("/"),
      b.scheduledStartTime,
      b.scheduledEndTime,
      STATUS_LABELS[b.status]  ?? b.status,
      PAYMENT_LABELS[b.paymentMethod] ?? b.paymentMethod,
      PSTATUS_LABELS[b.paymentStatus] ?? b.paymentStatus,
      Number(b.estimate.total).toFixed(2).replace(".", ","),
      cd ? `${cd.firstName} ${cd.lastName}` : "",
      cd?.email ?? "",
      cd?.phone ?? "",
      cd ? `${cd.address}${cd.aptNo ? ` ${cd.aptNo}` : ""}` : "",
      cd?.city ?? "",
      cd?.zip  ?? "",
      services,
      b.estimate.frequency,
    ];
    return cols.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `agendamentos-${member.company.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response("\uFEFF" + csv, { // BOM for Excel UTF-8
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
