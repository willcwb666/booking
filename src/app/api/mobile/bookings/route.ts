import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileSession } from "../_auth";

export async function GET(req: NextRequest) {
  const session = await getMobileSession(req);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Get all estimate IDs that belong to this customer
  const estimates = await db.estimate.findMany({
    where: { customerId: session.user.id },
    select: { id: true },
  });
  const estimateIds = estimates.map((e) => e.id);

  const bookings = await db.booking.findMany({
    where: { estimateId: { in: estimateIds } },
    include: {
      company: { select: { name: true, slug: true } },
      bookingConfig: { select: { name: true } },
      review: { select: { id: true, rating: true } },
    },
    orderBy: [{ scheduledDate: "desc" }, { scheduledStartTime: "desc" }],
  });

  return NextResponse.json(
    bookings.map((b) => ({
      id: b.id,
      companyName: b.company.name,
      companySlug: b.company.slug,
      serviceName: b.bookingConfig.name,
      scheduledDate: b.scheduledDate,
      scheduledStartTime: b.scheduledStartTime,
      scheduledEndTime: b.scheduledEndTime,
      status: b.status,
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus,
      hasReview: !!b.review,
    }))
  );
}
