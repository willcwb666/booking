import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { RATE_LIMITS, enforceRateLimit, getClientIp } from "@/lib/rate-limit";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function tokensMatch(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Escapa um valor de texto iCal (RFC 5545): backslash, ; , e quebras de linha. */
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toICSDate(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const companySlug = searchParams.get("company");
  const professionalId = searchParams.get("professional");
  const token = searchParams.get("token") ?? "";

  // O feed é público-por-token e devolve PII: sem limite, o token de 48 hex
  // seria varrível e cada tentativa custaria uma query.
  const rl = await enforceRateLimit(RATE_LIMITS.ICS_FEED, getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: rl.message },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } }
    );
  }

  if (!companySlug) {
    return NextResponse.json({ error: "Empresa não informada" }, { status: 400 });
  }

  const company = await db.company.findUnique({
    where: { slug: companySlug },
    select: { id: true, name: true, address: true, calendarFeedToken: true },
  });

  if (!company) {
    return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  }

  // O feed contém PII (nomes/telefones dos clientes): exige token secreto por
  // empresa. Sem token válido, nega — evita vazamento por slug enumerável.
  if (!company.calendarFeedToken || !token || !tokensMatch(token, company.calendarFeedToken)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Busca agendamentos ativos dos últimos 7 dias e próximos 90 dias
  const minDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const bookings = await db.booking.findMany({
    where: {
      companyId: company.id,
      scheduledDate: { gte: minDate },
      status: { notIn: ["CANCELLED"] },
      ...(professionalId ? { professionalId } : {}),
    },
    orderBy: [{ scheduledDate: "asc" }, { scheduledStartTime: "asc" }],
    take: 300,
    include: {
      bookingConfig: { select: { name: true } },
      customerDetail: { select: { firstName: true, lastName: true, phone: true } },
      professional: { select: { name: true } },
    },
  });

  const nowStamp = toICSDate(
    new Date().toISOString().split("T")[0],
    new Date().toISOString().split("T")[1].substring(0, 5)
  );

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kreator//Booking//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Agenda - ${company.name}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
  ];

  for (const b of bookings) {
    const uid = `booking-${b.id}@kreator.booking`;
    const dtStart = toICSDate(b.scheduledDate, b.scheduledStartTime);
    const dtEnd = toICSDate(b.scheduledDate, b.scheduledEndTime);
    const clientName = b.customerDetail
      ? `${b.customerDetail.firstName} ${b.customerDetail.lastName}`
      : "Cliente";
    const profName = b.professional?.name ? ` (${b.professional.name})` : "";
    // Escapa valores dinâmicos (nome/telefone do cliente vêm de input): evita
    // quebrar o formato ou injetar linhas iCal.
    const summary = esc(`${b.bookingConfig.name} - ${clientName}${profName}`);
    const description = `Cliente: ${esc(clientName)}\\nTelefone: ${esc(
      b.customerDetail?.phone || "Não informado"
    )}\\nServiço: ${esc(b.bookingConfig.name)}`;
    const location = esc(company.address || company.name);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${nowStamp}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="agenda-${companySlug}.ics"`,
      // Contém PII + token → nunca cachear em intermediários públicos
      "Cache-Control": "private, no-store",
    },
  });
}
