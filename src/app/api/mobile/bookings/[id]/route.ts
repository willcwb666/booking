import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileSession } from "../../_auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getMobileSession(req);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  // Verify ownership via estimate
  const estimates = await db.estimate.findMany({
    where: { customerId: session.user.id },
    select: { id: true },
  });
  const estimateIds = estimates.map((e) => e.id);

  const booking = await db.booking.findFirst({
    where: { id, estimateId: { in: estimateIds } },
    include: {
      company: { select: { name: true, slug: true, phone: true } },
      bookingConfig: { select: { name: true } },
      customerDetail: true,
      review: { select: { id: true, rating: true, comment: true } },
    },
  });

  if (!booking) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json({
    id: booking.id,
    companyName: booking.company.name,
    companySlug: booking.company.slug,
    companyPhone: booking.company.phone,
    serviceName: booking.bookingConfig.name,
    scheduledDate: booking.scheduledDate,
    scheduledStartTime: booking.scheduledStartTime,
    scheduledEndTime: booking.scheduledEndTime,
    status: booking.status,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    customer: booking.customerDetail
      ? {
          firstName: booking.customerDetail.firstName,
          lastName: booking.customerDetail.lastName,
          email: booking.customerDetail.email,
          phone: booking.customerDetail.phone,
          address: booking.customerDetail.address,
          city: booking.customerDetail.city,
        }
      : null,
    review: booking.review,
  });
}
