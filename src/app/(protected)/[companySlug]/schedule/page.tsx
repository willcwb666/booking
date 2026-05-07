import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCompanyBySlugForUser } from "@/server/queries/companies";
import { getProfessionals } from "@/server/queries/professionals";
import { getScheduleEvents } from "@/server/queries/schedule";
import { getDateRange } from "@/lib/calendar";
import type { CalendarView } from "@/lib/calendar";
import { ScheduleClient } from "./schedule-client";
import { notFound } from "next/navigation";

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{
    date?: string;
    view?: string;
    professional?: string;
  }>;
}) {
  const { companySlug } = await params;
  const { date, view = "week", professional = "all" } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  const company = await getCompanyBySlugForUser(companySlug, session!.user.id);
  if (!company) notFound();

  const today = new Date().toISOString().split("T")[0];
  const selectedDate = date ?? today;
  const selectedView = (
    ["day", "week", "month"].includes(view) ? view : "week"
  ) as CalendarView;

  const { from, to } = getDateRange(selectedDate, selectedView);

  const [professionals, events] = await Promise.all([
    getProfessionals(company.id),
    getScheduleEvents(
      company.id,
      from,
      to,
      professional !== "all" ? professional : undefined
    ),
  ]);

  const role = company.members[0].role;

  return (
    <ScheduleClient
      companySlug={companySlug}
      view={selectedView}
      selectedDate={selectedDate}
      selectedProfessional={professional}
      professionals={professionals.map((p) => ({ id: p.id, name: p.name }))}
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        notes: e.notes,
        professional: e.professional,
        createdBy: e.createdBy,
      }))}
      canManage={role !== "EMPLOYEE"}
      isOwner={role === "OWNER"}
    />
  );
}
