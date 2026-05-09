import "server-only";
import { google } from "googleapis";
import { encrypt, decrypt } from "./encrypt";

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
    scope: ["https://www.googleapis.com/auth/calendar.events"],
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
    const startDateTime = new Date(y, m - 1, d, ...params.startTime.split(":").map(Number) as [number, number]);
    const endDateTime = new Date(y, m - 1, d, ...params.endTime.split(":").map(Number) as [number, number]);

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
