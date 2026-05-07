import "server-only";
import { db } from "@/lib/db";

export async function getBookingById(id: string) {
  return db.booking.findUnique({
    where: { id },
    include: {
      estimate: {
        include: {
          serviceTypes: {
            include: {
              serviceType: { select: { name: true, service: { select: { name: true } } } },
            },
          },
          extraServices: {
            include: {
              extraService: { select: { name: true } },
            },
          },
        },
      },
      bookingConfig: {
        include: { company: { select: { name: true, logoUrl: true } } },
      },
      customerDetail: true,
      // Never return accessNote — excluded from select
      homeAccess: {
        select: {
          accessType: true,
          keepKeyWithProvider: true,
          additionalNote: true,
        },
      },
      professional: { select: { id: true, name: true } },
    },
  });
}
