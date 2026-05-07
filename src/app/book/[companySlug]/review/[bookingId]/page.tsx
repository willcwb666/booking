import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ReviewClient } from "./review-client";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ companySlug: string; bookingId: string }>;
}) {
  const { companySlug, bookingId } = await params;

  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      status: "COMPLETED",
      company: { slug: companySlug },
    },
    include: {
      company: { select: { name: true } },
      review: { select: { id: true } },
      customerDetail: { select: { firstName: true } },
      estimate: {
        include: {
          serviceTypes: {
            include: {
              serviceType: { select: { name: true, service: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!booking) notFound();

  const alreadyReviewed = !!booking.review;

  return (
    <ReviewClient
      bookingId={bookingId}
      companyName={booking.company.name}
      customerFirstName={booking.customerDetail?.firstName ?? null}
      scheduledDate={booking.scheduledDate}
      serviceLabels={booking.estimate.serviceTypes.map(
        (s) => `${s.serviceType.service.name} — ${s.serviceType.name}`
      )}
      alreadyReviewed={alreadyReviewed}
    />
  );
}
