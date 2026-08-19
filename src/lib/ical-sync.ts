import "server-only";
import { db } from "@/lib/db";
import { assertPublicHttpsUrl } from "@/lib/ssrf";

const MAX_ICAL_BYTES = 5 * 1024 * 1024; // 5 MB — evita download abusivo

export type ParsedIcalEvent = {
  uid: string;
  summary: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isAllDay: boolean;
};

/**
 * Parser leve e robusto para arquivos iCal / .ics (RFC 5545)
 * Suporta formatos de data UTC e local (YYYYMMDDTHHMMSSZ, YYYYMMDDTHHMMSS, YYYYMMDD)
 */
export function parseIcal(icsContent: string): ParsedIcalEvent[] {
  const events: ParsedIcalEvent[] = [];
  const lines = icsContent.replace(/\r\n/g, "\n").replace(/\n /g, "").split("\n");

  let inEvent = false;
  let currentUid = "";
  let currentSummary = "";
  let currentDtStart = "";
  let currentDtEnd = "";

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      currentUid = "";
      currentSummary = "Compromisso Externo";
      currentDtStart = "";
      currentDtEnd = "";
      continue;
    }

    if (line.startsWith("END:VEVENT")) {
      if (inEvent && currentDtStart) {
        const parsed = formatIcalEvent(currentUid, currentSummary, currentDtStart, currentDtEnd);
        if (parsed) {
          events.push(parsed);
        }
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    if (line.startsWith("UID:")) {
      currentUid = line.substring(4).trim();
    } else if (line.startsWith("SUMMARY:")) {
      currentSummary = line.substring(8).trim() || "Compromisso";
    } else if (line.startsWith("DTSTART")) {
      const parts = line.split(":");
      currentDtStart = parts.slice(1).join(":");
    } else if (line.startsWith("DTEND")) {
      const parts = line.split(":");
      currentDtEnd = parts.slice(1).join(":");
    }
  }

  return events;
}

function parseIcalDate(val: string): { date: string; time: string; isAllDay: boolean } | null {
  const clean = val.replace(/[^0-9T]/g, "");
  if (clean.length === 8) {
    // All day: YYYYMMDD
    const y = clean.slice(0, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    return { date: `${y}-${m}-${d}`, time: "00:00", isAllDay: true };
  }

  if (clean.includes("T")) {
    const [dPart, tPart] = clean.split("T");
    const y = dPart.slice(0, 4);
    const m = dPart.slice(4, 6);
    const d = dPart.slice(6, 8);
    const hh = tPart.slice(0, 2) || "00";
    const mm = tPart.slice(2, 4) || "00";
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}`, isAllDay: false };
  }

  return null;
}

function formatIcalEvent(
  uid: string,
  summary: string,
  dtStartRaw: string,
  dtEndRaw: string
): ParsedIcalEvent | null {
  const start = parseIcalDate(dtStartRaw);
  if (!start) return null;

  let end = dtEndRaw ? parseIcalDate(dtEndRaw) : null;
  if (!end) {
    end = { date: start.date, time: start.isAllDay ? "23:59" : "23:59", isAllDay: start.isAllDay };
  }

  return {
    uid: uid || `ical_${Math.random().toString(36).slice(2)}`,
    summary,
    date: start.date,
    startTime: start.isAllDay ? "00:00" : start.time,
    endTime: start.isAllDay ? "23:59" : end.time,
    isAllDay: start.isAllDay,
  };
}

/**
 * Sincroniza um feed .ics externo (Apple Calendar / Outlook / Google iCal)
 * gravando os bloqueios na tabela ScheduleEvent
 */
export async function syncIcalFeedToBooking(
  companyId: string,
  userId: string,
  professionalId: string | null,
  icalUrl: string
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    // Normaliza URL (ex: webcal:// para https://)
    let url = icalUrl.trim();
    if (url.startsWith("webcal://")) {
      url = "https://" + url.slice(9);
    }

    // Anti-SSRF: exige HTTPS e recusa destinos internos (a URL vem do usuário)
    await assertPublicHttpsUrl(url);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "KreatorBookingCalendarSync/2.0",
        Accept: "text/calendar, text/plain",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10000), // 10s
    });

    if (!res.ok) {
      throw new Error(`Falha ao baixar feed iCal (${res.status} ${res.statusText})`);
    }

    // Limite de tamanho — evita consumir memória com respostas gigantes
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_ICAL_BYTES) {
      throw new Error("Feed iCal excede o tamanho máximo permitido");
    }
    const text = await res.text();
    if (text.length > MAX_ICAL_BYTES) {
      throw new Error("Feed iCal excede o tamanho máximo permitido");
    }
    const events = parseIcal(text);

    // Filtra eventos relevantes (dos últimos 2 dias até os próximos 45 dias)
    const now = new Date();
    const minDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const maxDate = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const validEvents = events.filter((e) => e.date >= minDate && e.date <= maxDate);

    // Remove eventos antigos importados deste feed
    await db.scheduleEvent.deleteMany({
      where: {
        companyId,
        professionalId: professionalId || undefined,
        source: "ICAL_FEED",
        date: { gte: minDate, lte: maxDate },
      },
    });

    // Insere os novos bloqueios
    let count = 0;
    for (const ev of validEvents) {
      await db.scheduleEvent.create({
        data: {
          companyId,
          professionalId,
          title: `[iCal] ${ev.summary}`,
          type: "EVENT",
          date: ev.date,
          startTime: ev.startTime,
          endTime: ev.endTime,
          notes: "Sincronizado automaticamente via Feed iCal/Apple Calendar",
          externalEventId: ev.uid,
          source: "ICAL_FEED",
          createdById: userId,
        },
      });
      count++;
    }

    // Atualiza data de última sincronização
    await db.calendarIntegration.updateMany({
      where: {
        userId,
        provider: "ICAL_FEED",
      },
      data: { lastSyncedAt: new Date() },
    });

    return { success: true, syncedCount: count };
  } catch (err: unknown) {
    console.error("[syncIcalFeedToBooking] Erro:", err);
    return {
      success: false,
      syncedCount: 0,
      error: err instanceof Error ? err.message : "Erro na sincronização iCal",
    };
  }
}
