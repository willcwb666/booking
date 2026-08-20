import "server-only";
import { google } from "googleapis";
import { encrypt, decrypt } from "./encrypt";
import { db } from "./db";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "";

export function getOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl(state: string): string {
  const oAuth2Client = getOAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    state,
    prompt: "consent",
  });
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}> {
  const oAuth2Client = getOAuthClient();
  const { tokens } = await oAuth2Client.getToken(code);
  return {
    accessToken: encrypt(tokens.access_token ?? ""),
    refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
  };
}

/**
 * Cria evento no Google Calendar (Sentido 1: Booking -> Google Calendar)
 */
export async function createCalendarEvent(
  encryptedAccessToken: string,
  encryptedRefreshToken: string | null,
  params: {
    summary: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    calendarId?: string;
  }
): Promise<string | null> {
  try {
    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials({
      access_token: decrypt(encryptedAccessToken),
      refresh_token: encryptedRefreshToken ? decrypt(encryptedRefreshToken) : undefined,
    });

    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    const [y, m, d] = params.date.split("-").map(Number);
    const startDateTime = new Date(y, m - 1, d, ...(params.startTime.split(":").map(Number) as [number, number]));
    const endDateTime = new Date(y, m - 1, d, ...(params.endTime.split(":").map(Number) as [number, number]));

    const res = await calendar.events.insert({
      calendarId: params.calendarId ?? "primary",
      requestBody: {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: { dateTime: startDateTime.toISOString() },
        end: { dateTime: endDateTime.toISOString() },
      },
    });

    return res.data.id ?? null;
  } catch (err) {
    console.error("[google-calendar] createCalendarEvent failed:", err);
    return null;
  }
}

/**
 * Remove evento no Google Calendar
 */
export async function deleteCalendarEvent(
  encryptedAccessToken: string,
  encryptedRefreshToken: string | null,
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials({
      access_token: decrypt(encryptedAccessToken),
      refresh_token: encryptedRefreshToken ? decrypt(encryptedRefreshToken) : undefined,
    });
    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    await calendar.events.delete({ calendarId, eventId });
  } catch (err) {
    console.error("[google-calendar] deleteCalendarEvent failed:", err);
  }
}

/**
 * Busca eventos do Google Calendar para um período (Sentido 2: Google Calendar -> Booking)
 */
export async function fetchGoogleCalendarEvents(
  encryptedAccessToken: string,
  encryptedRefreshToken: string | null,
  timeMin: Date,
  timeMax: Date,
  calendarId: string = "primary"
): Promise<
  Array<{
    id: string;
    summary: string;
    date: string;
    startTime: string;
    endTime: string;
  }>
> {
  try {
    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials({
      access_token: decrypt(encryptedAccessToken),
      refresh_token: encryptedRefreshToken ? decrypt(encryptedRefreshToken) : undefined,
    });

    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });
    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const items = res.data.items || [];
    const formatted: Array<{
      id: string;
      summary: string;
      date: string;
      startTime: string;
      endTime: string;
    }> = [];

    for (const item of items) {
      if (item.status === "cancelled") continue;

      let date = "";
      let startTime = "00:00";
      let endTime = "23:59";

      if (item.start?.dateTime) {
        const d = new Date(item.start.dateTime);
        date = d.toISOString().split("T")[0];
        startTime = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      } else if (item.start?.date) {
        date = item.start.date;
      }

      if (item.end?.dateTime) {
        const d = new Date(item.end.dateTime);
        endTime = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      }

      if (date) {
        formatted.push({
          id: item.id || `gcal_${Math.random().toString(36).slice(2)}`,
          summary: item.summary || "Compromisso Google Calendar",
          date,
          startTime,
          endTime,
        });
      }
    }

    return formatted;
  } catch (err) {
    console.error("[google-calendar] fetchGoogleCalendarEvents failed:", err);
    return [];
  }
}

/**
 * Sincronização 2-Way: Google Calendar -> Booking (cria bloqueios automáticos no ScheduleEvent)
 */
export async function syncGoogleCalendarToBooking(
  companyId: string,
  userId: string,
  professionalId: string | null = null,
  daysAhead: number = 30
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  try {
    const integration = await db.calendarIntegration.findFirst({
      where: {
        userId,
        provider: "GOOGLE",
        isActive: true,
      },
    });

    if (!integration || !integration.accessToken) {
      return { success: false, syncedCount: 0, error: "Integração Google Calendar não encontrada" };
    }

    const now = new Date();
    const timeMin = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const timeMax = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const events = await fetchGoogleCalendarEvents(
      integration.accessToken,
      integration.refreshToken,
      timeMin,
      timeMax,
      integration.calendarId || "primary"
    );

    const minDateStr = timeMin.toISOString().split("T")[0];
    const maxDateStr = timeMax.toISOString().split("T")[0];

    // Remove eventos do Google Calendar sincronizados anteriormente neste período
    await db.scheduleEvent.deleteMany({
      where: {
        companyId,
        professionalId: professionalId || undefined,
        source: "GOOGLE_CALENDAR",
        date: { gte: minDateStr, lte: maxDateStr },
      },
    });

    let count = 0;
    for (const ev of events) {
      // Ignora eventos criados pelo próprio sistema para não duplicar
      if (ev.summary.includes("[Booking #") || ev.summary.includes("Agendamento #")) continue;

      await db.scheduleEvent.create({
        data: {
          companyId,
          professionalId,
          title: `[Google] ${ev.summary}`,
          type: "EVENT",
          date: ev.date,
          startTime: ev.startTime,
          endTime: ev.endTime,
          notes: "Compromisso pessoal sincronizado do Google Calendar",
          externalEventId: ev.id,
          source: "GOOGLE_CALENDAR",
          createdById: userId,
        },
      });
      count++;
    }

    await db.calendarIntegration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date() },
    });

    return { success: true, syncedCount: count };
  } catch (err) {
    console.error("[syncGoogleCalendarToBooking] Falha:", err);
    const message = err instanceof Error ? err.message : "Erro na sincronização";
    return { success: false, syncedCount: 0, error: message };
  }
}
