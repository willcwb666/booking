import { NextRequest, NextResponse } from "next/server";
import { getActiveSession } from "@/lib/session";
import { RATE_LIMITS, enforceRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/lib/db";

/**
 * Previne formula injection no Excel/Sheets: valores controláveis pelo
 * cliente (nome, endereço, etc.) que começam com =, +, -, @ ou tab/CR
 * seriam interpretados como fórmula ao abrir o CSV.
 */
function sanitizeCsvCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export async function GET(req: NextRequest) {
  const session = await getActiveSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Cada chamada despeja a base de clientes inteira em CSV — limitar reduz a
  // janela de exfiltração se uma conta de gestor for comprometida.
  const rl = await enforceRateLimit(RATE_LIMITS.EXPORT, session.user.id);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { searchParams } = req.nextUrl;
  const companySlug = searchParams.get("slug") ?? "";
  const from = searchParams.get("from") ?? "";
  const to   = searchParams.get("to")   ?? "";
  const status = searchParams.get("status") ?? "";

  const member = await db.companyUser.findFirst({
    where: { userId: session.user.id, isActive: true, company: { slug: companySlug } },
    include: { company: { select: { id: true, name: true, currency: true, locale: true } } },
  });
  if (!member) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  // Export contém PII de todos os clientes — restrito a gestão da empresa
  if (member.role !== "OWNER" && member.role !== "MANAGER") {
    return NextResponse.json({ error: "Sem permissão para exportar dados" }, { status: 403 });
  }

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

  const { currency, locale } = member.company;
  // Separador decimal conforme o locale da empresa (vírgula pt-BR, ponto en-US)
  const formatAmount = (value: number) => {
    try {
      return value.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: false,
      });
    } catch {
      return value.toFixed(2).replace(".", ",");
    }
  };

  const header = [
    "ID", "Data", "Início", "Fim", "Status", "Pagamento", "Status Pagamento",
    `Valor (${currency})`, "Cliente", "E-mail", "Telefone", "Endereço", "Cidade", "CEP",
    "Serviços", "Frequência",
  ].join(";");

  const rows = bookings.map((b) => {
    const cd = b.customerDetail;
    const services = (b.estimate?.serviceTypes ?? []).map((s) => s.serviceType.name).join(", ");
    const cols = [
      b.id,
      b.scheduledDate.split("-").reverse().join("/"),
      b.scheduledStartTime,
      b.scheduledEndTime,
      STATUS_LABELS[b.status]  ?? b.status,
      PAYMENT_LABELS[b.paymentMethod] ?? b.paymentMethod,
      PSTATUS_LABELS[b.paymentStatus] ?? b.paymentStatus,
      formatAmount(Number(b.estimate?.total ?? 0)),
      cd ? `${cd.firstName} ${cd.lastName}` : "",
      cd?.email ?? "",
      cd?.phone ?? "",
      cd ? `${cd.address}${cd.aptNo ? ` ${cd.aptNo}` : ""}` : "",
      cd?.city ?? "",
      cd?.zip  ?? "",
      services,
      b.estimate?.frequency ?? "",
    ];
    return cols.map((v) => `"${sanitizeCsvCell(String(v)).replace(/"/g, '""')}"`).join(";");
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
