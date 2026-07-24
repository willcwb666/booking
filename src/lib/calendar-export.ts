/**
 * Gerador de Links de Calendário (Google Calendar & iCal / .ics)
 */

type CalendarEventParams = {
  title: string;
  description: string;
  location: string;
  startDateStr: string; // YYYY-MM-DD
  startTimeStr: string; // HH:mm
  endTimeStr: string;   // HH:mm
};

/**
 * Converte data e hora locais para o formato ISO 8601 compacto exigido pelo Google Calendar (YYYYMMDDTHHmmSS).
 */
function toCompactIso(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.replace(/\D/g, "");
  const cleanTime = timeStr.replace(/\D/g, "").padEnd(4, "0");
  return `${cleanDate}T${cleanTime}00`;
}

/**
 * Gera um link direto "Adicionar à Google Agenda"
 */
export function generateGoogleCalendarUrl(params: CalendarEventParams): string {
  const startIso = toCompactIso(params.startDateStr, params.startTimeStr);
  const endIso = toCompactIso(params.startDateStr, params.endTimeStr);

  const baseUrl = "https://calendar.google.com/calendar/render";
  const searchParams = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    details: params.description,
    location: params.location,
    dates: `${startIso}/${endIso}`,
  });

  return `${baseUrl}?${searchParams.toString()}`;
}

/**
 * Gera a estrutura de um arquivo iCal (.ics) para ser baixado ou importado no Apple Calendar / Outlook.
 */
export function generateIcsContent(params: CalendarEventParams): string {
  const startIso = toCompactIso(params.startDateStr, params.startTimeStr);
  const endIso = toCompactIso(params.startDateStr, params.endTimeStr);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kreator Booking//PT",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `SUMMARY:${params.title.replace(/\n/g, " ")}`,
    `DESCRIPTION:${params.description.replace(/\n/g, " ")}`,
    `LOCATION:${params.location.replace(/\n/g, " ")}`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `STATUS:CONFIRMED`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
